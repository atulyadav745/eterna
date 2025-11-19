import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { config } from './config/config';
import { database } from './config/database';
import { redisClient } from './config/redis';
import { Logger } from './utils/logger';
import { WebSocketManager } from './websocket/websocket.manager';
import { OrderQueue } from './queue/order.queue';
import { registerOrderRoutes } from './api/order.routes';

async function start() {
  const fastify = Fastify({
    logger: false, // Using custom logger
  });

  try {
    // Register WebSocket support
    await fastify.register(websocket);

    // Initialize WebSocket manager
    const wsManager = new WebSocketManager();
    wsManager.initialize(fastify);

    // Initialize order queue
    const orderQueue = new OrderQueue(wsManager);

    // Register routes
    registerOrderRoutes(fastify, orderQueue);

    // Register health routes
    const { healthRoutes } = await import('./api/health.routes');
    await fastify.register(healthRoutes);

    // Health checks
    const dbHealthy = await database.healthCheck();
    const redisHealthy = await redisClient.healthCheck();

    if (!dbHealthy) {
      Logger.error('Database health check failed');
      throw new Error('Database not available');
    }

    if (!redisHealthy) {
      Logger.error('Redis health check failed');
      throw new Error('Redis not available');
    }

    Logger.info('All health checks passed');

    // Start server
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    Logger.info('Server started', {
      host: config.server.host,
      port: config.server.port,
      env: config.server.env,
    });

    Logger.info('Order Execution Engine is ready to process orders');
    Logger.info(`WebSocket endpoint: ws://${config.server.host}:${config.server.port}/ws?orderId=<ORDER_ID>`);
    Logger.info(`API endpoint: http://${config.server.host}:${config.server.port}/api/orders/execute`);

    // Graceful shutdown
    const closeGracefully = async (signal: string) => {
      Logger.info(`Received ${signal}, closing gracefully`);

      await orderQueue.close();
      await fastify.close();
      await database.close();
      await redisClient.close();

      Logger.info('Server closed');
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
