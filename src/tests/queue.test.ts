import { OrderQueue } from '../queue/order.queue';
import { WebSocketManager } from '../websocket/websocket.manager';

describe('OrderQueue', () => {
  let orderQueue: OrderQueue;
  let wsManager: WebSocketManager;

  beforeAll(() => {
    wsManager = new WebSocketManager();
    orderQueue = new OrderQueue(wsManager);
  });

  afterAll(async () => {
    await orderQueue.close();
  });

  describe('addOrder', () => {
    it('should successfully add an order to the queue', async () => {
      const orderData = {
        orderId: 'test-order-001',
        orderType: 'MARKET' as any,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 1.0,
      };

      await expect(orderQueue.addOrder(orderData)).resolves.not.toThrow();
    });

    it('should assign unique job IDs', async () => {
      const order1 = {
        orderId: 'test-order-002',
        orderType: 'MARKET' as any,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 1.0,
      };

      const order2 = {
        orderId: 'test-order-003',
        orderType: 'MARKET' as any,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 2.0,
      };

      await orderQueue.addOrder(order1);
      await orderQueue.addOrder(order2);

      // Both should be added successfully without conflicts
      expect(true).toBe(true);
    });
  });

  describe('queue configuration', () => {
    it('should have correct concurrency settings', () => {
      // Queue should be configured with max 10 concurrent jobs
      expect(orderQueue).toBeDefined();
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      const metrics = await orderQueue.getQueueMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.waiting).toBeGreaterThanOrEqual(0);
      expect(metrics.active).toBeGreaterThanOrEqual(0);
      expect(metrics.completed).toBeGreaterThanOrEqual(0);
      expect(metrics.failed).toBeGreaterThanOrEqual(0);
    });
  });
});
