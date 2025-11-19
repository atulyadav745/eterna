import { FastifyInstance, FastifyRequest } from 'fastify';
import { OrderStatus, WebSocketMessage } from '../models/order.model';
import { Logger } from '../utils/logger';

interface WebSocketConnection {
  socket: any;
}

export class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();

  initialize(fastify: FastifyInstance): void {
    fastify.register(async (fastify) => {
      fastify.get(
        '/ws',
        { websocket: true },
        (connection: WebSocketConnection, req: FastifyRequest) => {
          const { orderId } = req.query as { orderId?: string };

          if (!orderId) {
            connection.socket.close(1008, 'Order ID is required');
            return;
          }

          Logger.info('WebSocket connected', { orderId });

          // Store connection
          this.connections.set(orderId, connection);

          // Send initial connected message
          this.sendMessage(connection, {
            orderId,
            status: OrderStatus.PENDING,
            message: 'Connected to order status stream',
            timestamp: new Date(),
          });

          connection.socket.on('close', () => {
            Logger.info('WebSocket disconnected', { orderId });
            this.connections.delete(orderId);
          });

          connection.socket.on('error', (error: Error) => {
            Logger.error('WebSocket error', { orderId, error: error.message });
            this.connections.delete(orderId);
          });
        }
      );
    });

    Logger.info('WebSocket manager initialized');
  }

  sendStatusUpdate(
    orderId: string,
    status: OrderStatus,
    message: string,
    data?: any
  ): void {
    const connection = this.connections.get(orderId);

    if (!connection) {
      Logger.debug('No WebSocket connection for order', { orderId });
      return;
    }

    const wsMessage: WebSocketMessage = {
      orderId,
      status,
      message,
      data,
      timestamp: new Date(),
    };

    this.sendMessage(connection, wsMessage);
  }

  private sendMessage(connection: WebSocketConnection, message: WebSocketMessage): void {
    try {
      connection.socket.send(JSON.stringify(message));
      Logger.debug('WebSocket message sent', {
        orderId: message.orderId,
        status: message.status,
      });
    } catch (error) {
      Logger.error('Failed to send WebSocket message', error);
    }
  }

  closeConnection(orderId: string): void {
    const connection = this.connections.get(orderId);
    if (connection) {
      connection.socket.close();
      this.connections.delete(orderId);
      Logger.info('WebSocket connection closed', { orderId });
    }
  }

  getActiveConnections(): number {
    return this.connections.size;
  }
}
