import { OrderService } from '../services/order.service';
import { MockDexRouter } from '../services/dex-router.service';
import { OrderType, OrderStatus } from '../models/order.model';
import { database } from '../config/database';

describe('Integration Tests', () => {
  let orderService: OrderService;
  let dexRouter: MockDexRouter;

  beforeAll(() => {
    orderService = new OrderService();
    dexRouter = new MockDexRouter();
  });

  afterAll(async () => {
    // Clean up test orders - delete history first due to foreign key constraint
    await database.query(
      'DELETE FROM order_history WHERE order_id IN (SELECT id FROM orders WHERE token_in = $1)',
      ['INTEGRATION_TEST']
    );
    await database.query('DELETE FROM orders WHERE token_in = $1', ['INTEGRATION_TEST']);
  });

  describe('Complete Order Flow', () => {
    it('should process an order from creation to completion', async () => {
      // Step 1: Create order
      const order = await orderService.createOrder({
        orderType: OrderType.MARKET,
        tokenIn: 'INTEGRATION_TEST',
        tokenOut: 'USDC',
        amountIn: 1.0,
        status: OrderStatus.PENDING,
        retryCount: 0,
      });

      expect(order.status).toBe(OrderStatus.PENDING);

      // Step 2: Route order
      await orderService.updateOrderStatus(order.id, OrderStatus.ROUTING);

      const routingResult = await dexRouter.getBestQuote('INTEGRATION_TEST', 'USDC', 1.0);

      await orderService.updateOrderStatus(order.id, OrderStatus.ROUTING, {
        selectedDex: routingResult.bestQuote.dex,
      });

      // Step 3: Build transaction
      await orderService.updateOrderStatus(order.id, OrderStatus.BUILDING);

      // Step 4: Execute swap
      const swapResult = await dexRouter.executeSwap(
        routingResult.bestQuote.dex,
        'INTEGRATION_TEST',
        'USDC',
        1.0,
        routingResult.bestQuote.effectivePrice
      );

      expect(swapResult.success).toBe(true);

      // Step 5: Submit transaction
      await orderService.updateOrderStatus(order.id, OrderStatus.SUBMITTED, {
        txHash: swapResult.txHash,
      });

      // Step 6: Confirm
      await orderService.updateOrderStatus(order.id, OrderStatus.CONFIRMED, {
        executedPrice: swapResult.executedPrice,
        amountOut: swapResult.amountOut,
        txHash: swapResult.txHash,
      });

      // Verify final state
      const finalOrder = await orderService.getOrderById(order.id);
      expect(finalOrder?.status).toBe(OrderStatus.CONFIRMED);
      expect(finalOrder?.txHash).toBeDefined();
      expect(finalOrder?.executedPrice).toBeGreaterThan(0);
      expect(finalOrder?.completedAt).toBeInstanceOf(Date);
    }, 30000);

    it('should handle routing decision correctly', async () => {
      const routingResult = await dexRouter.getBestQuote('SOL', 'USDC', 5.0);

      expect(routingResult.bestQuote).toBeDefined();
      expect(routingResult.allQuotes).toHaveLength(2);

      // Verify the selected DEX has the better price
      const otherQuote = routingResult.allQuotes.find(
        (q) => q.dex !== routingResult.bestQuote.dex
      );
      expect(routingResult.bestQuote.effectivePrice).toBeLessThanOrEqual(
        otherQuote?.effectivePrice || Infinity
      );
    });
  });

  describe('Database Integration', () => {
    it('should persist order history correctly', async () => {
      const order = await orderService.createOrder({
        orderType: OrderType.MARKET,
        tokenIn: 'INTEGRATION_TEST',
        tokenOut: 'USDC',
        amountIn: 1.0,
        status: OrderStatus.PENDING,
        retryCount: 0,
      });

      await orderService.updateOrderStatus(order.id, OrderStatus.ROUTING);
      await orderService.updateOrderStatus(order.id, OrderStatus.BUILDING);
      await orderService.updateOrderStatus(order.id, OrderStatus.SUBMITTED);

      const history = await database.query(
        'SELECT * FROM order_history WHERE order_id = $1 ORDER BY created_at ASC',
        [order.id]
      );

      expect(history.rows.length).toBeGreaterThanOrEqual(3);
    });
  });
});
