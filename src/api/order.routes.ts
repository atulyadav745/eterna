import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OrderService } from '../services/order.service';
import { OrderQueue } from '../queue/order.queue';
import { OrderType, OrderStatus, OrderSubmission, OrderResponse } from '../models/order.model';
import { Logger } from '../utils/logger';

export function registerOrderRoutes(fastify: FastifyInstance, orderQueue: OrderQueue): void {
  const orderService = new OrderService();

  // Submit order endpoint
  fastify.post<{ Body: OrderSubmission }>(
    '/api/orders/execute',
    async (request: FastifyRequest<{ Body: OrderSubmission }>, reply: FastifyReply) => {
      try {
        const { orderType, tokenIn, tokenOut, amountIn } = request.body;

        // Validate input
        if (!orderType || !tokenIn || !tokenOut || !amountIn) {
          return reply.status(400).send({
            error: 'Missing required fields: orderType, tokenIn, tokenOut, amountIn',
          });
        }

        if (amountIn <= 0) {
          return reply.status(400).send({
            error: 'amountIn must be greater than 0',
          });
        }

        if (!Object.values(OrderType).includes(orderType)) {
          return reply.status(400).send({
            error: `Invalid order type. Supported: ${Object.values(OrderType).join(', ')}`,
          });
        }

        // Currently only MARKET orders are supported
        if (orderType !== OrderType.MARKET) {
          return reply.status(400).send({
            error: 'Only MARKET orders are currently supported',
          });
        }

        // Create order in database
        const order = await orderService.createOrder({
          orderType,
          tokenIn,
          tokenOut,
          amountIn,
          status: OrderStatus.PENDING,
          retryCount: 0,
        });

        // Add order to queue
        await orderQueue.addOrder({
          orderId: order.id,
          orderType,
          tokenIn,
          tokenOut,
          amountIn,
        });

        const response: OrderResponse = {
          orderId: order.id,
          status: OrderStatus.PENDING,
          message: 'Order received and queued for execution',
        };

        Logger.info('Order submitted', {
          orderId: order.id,
          tokenIn,
          tokenOut,
          amountIn,
        });

        return reply.status(201).send(response);
      } catch (error: any) {
        Logger.error('Failed to submit order', error);
        return reply.status(500).send({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  );

  // Get order status endpoint
  fastify.get<{ Params: { orderId: string } }>(
    '/api/orders/:orderId',
    async (request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      try {
        const { orderId } = request.params;

        const order = await orderService.getOrderById(orderId);

        if (!order) {
          return reply.status(404).send({
            error: 'Order not found',
          });
        }

        return reply.send(order);
      } catch (error: any) {
        Logger.error('Failed to get order', error);
        return reply.status(500).send({
          error: 'Internal server error',
          message: error.message,
        });
      }
    }
  );

  Logger.info('Order routes registered');
}
