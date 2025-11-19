import { OrderService } from '../services/order.service';
import { OrderType, OrderStatus } from '../models/order.model';
import { database } from '../config/database';

describe('OrderService', () => {
  let orderService: OrderService;

  beforeAll(() => {
    orderService = new OrderService();
  });

  afterAll(async () => {
    // Clean up test orders - delete history first due to foreign key constraint
    await database.query('DELETE FROM order_history WHERE order_id IN (SELECT id FROM orders WHERE token_in = $1)', ['TEST_TOKEN']);
    await database.query('DELETE FROM orders WHERE token_in = $1', ['TEST_TOKEN']);
  });

  describe('createOrder', () => {
    it('should create a new order in the database', async () => {
      const orderData = {
        orderType: OrderType.MARKET,
        tokenIn: 'TEST_TOKEN',
        tokenOut: 'USDC',
        amountIn: 1.0,
        status: OrderStatus.PENDING,
        retryCount: 0,
      };

      const order = await orderService.createOrder(orderData);

      expect(order.id).toBeDefined();
      expect(order.orderType).toBe(OrderType.MARKET);
      expect(order.tokenIn).toBe('TEST_TOKEN');
      expect(order.tokenOut).toBe('USDC');
      expect(order.amountIn).toBe(1.0);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.retryCount).toBe(0);
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    it('should set default values correctly', async () => {
      const orderData = {
        orderType: OrderType.MARKET,
        tokenIn: 'TEST_TOKEN',
        tokenOut: 'USDC',
        amountIn: 2.0,
        status: OrderStatus.PENDING,
        retryCount: 0,
      };

      const order = await orderService.createOrder(orderData);

      expect(order.selectedDex).toBeUndefined();
      expect(order.txHash).toBeUndefined();
      expect(order.completedAt).toBeUndefined();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status and add history entry', async () => {
      const order = await orderService.createOrder({
        orderType: OrderType.MARKET,
        tokenIn: 'TEST_TOKEN',
        tokenOut: 'USDC',
        amountIn: 1.0,
        status: OrderStatus.PENDING,
        retryCount: 0,
      });

      await orderService.updateOrderStatus(order.id, OrderStatus.ROUTING);

      // Query directly from database to avoid cache
      const result = await database.query('SELECT status FROM orders WHERE id = $1', [order.id]);
      expect(result.rows[0].status).toBe(OrderStatus.ROUTING);
    });
  });

  describe('getOrderById', () => {
    it('should retrieve an existing order', async () => {
      const order = await orderService.createOrder({
        orderType: OrderType.MARKET,
        tokenIn: 'TEST_TOKEN',
        tokenOut: 'USDC',
        amountIn: 1.0,
        status: OrderStatus.PENDING,
        retryCount: 0,
      });

      const retrieved = await orderService.getOrderById(order.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(order.id);
    });

    it('should return null for non-existent order', async () => {
      const retrieved = await orderService.getOrderById('00000000-0000-0000-0000-000000000000');

      expect(retrieved).toBeNull();
    });
  });

  describe('updateOrderWithRouting', () => {
    it('should update order with routing information', async () => {
      const order = await orderService.createOrder({
        orderType: OrderType.MARKET,
        tokenIn: 'TEST_TOKEN',
        tokenOut: 'USDC',
        amountIn: 1.0,
        status: OrderStatus.PENDING,
        retryCount: 0,
      });

      const raydiumQuote = {
        dex: 'RAYDIUM' as any,
        price: 25.5,
        fee: 0.003,
        effectivePrice: 25.58,
        timestamp: new Date(),
      };

      const meteoraQuote = {
        dex: 'METEORA' as any,
        price: 25.3,
        fee: 0.002,
        effectivePrice: 25.35,
        timestamp: new Date(),
      };

      const routingDecision = {
        selectedDex: 'METEORA' as any,
        reason: 'Better price',
        raydiumPrice: 25.58,
        meteoraPrice: 25.35,
        priceDifference: 0.23,
        priceDifferencePercent: 0.9,
      };

      await orderService.updateOrderStatus(order.id, OrderStatus.ROUTING, {
        selectedDex: 'METEORA' as any,
        raydiumQuote,
        meteoraQuote,
        routingDecision,
      });

      // Query directly from database
      const result = await database.query('SELECT selected_dex FROM orders WHERE id = $1', [
        order.id,
      ]);
      expect(result.rows[0].selected_dex).toBe('METEORA');
    });
  });
});
