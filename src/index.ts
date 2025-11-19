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
  // Check required environment variables
  if (!process.env.DATABASE_URL) {
    Logger.error('DATABASE_URL environment variable is not set');
    Logger.error('Please add DATABASE_URL to your Render service environment variables');
    process.exit(1);
  }

  if (!process.env.REDIS_HOST) {
    Logger.error('REDIS_HOST environment variable is not set');
    Logger.error('Redis service may not be properly configured');
    process.exit(1);
  }

  Logger.info('Starting Eterna Order Execution Engine...');
  Logger.info('Environment:', config.server.env);

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

    // Health checks with retries
    Logger.info('Performing health checks...');
    
    let dbHealthy = false;
    let redisHealthy = false;
    const maxRetries = 5;
    const retryDelay = 3000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        dbHealthy = await database.healthCheck();
        if (dbHealthy) {
          Logger.info('Database connected successfully');
          break;
        }
      } catch (error: any) {
        Logger.warn(`Database health check attempt ${i + 1}/${maxRetries} failed: ${error.message}`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    for (let i = 0; i < maxRetries; i++) {
      try {
        redisHealthy = await redisClient.healthCheck();
        if (redisHealthy) {
          Logger.info('Redis connected successfully');
          break;
        }
      } catch (error: any) {
        Logger.warn(`Redis health check attempt ${i + 1}/${maxRetries} failed: ${error.message}`);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (!dbHealthy) {
      Logger.error('Database health check failed after all retries');
      Logger.error('Please ensure DATABASE_URL environment variable is set correctly');
      throw new Error('Database not available');
    }

    if (!redisHealthy) {
      Logger.error('Redis health check failed after all retries');
      Logger.error('Please ensure REDIS_HOST and REDIS_PORT environment variables are set correctly');
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
