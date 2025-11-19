import { database } from '../config/database';
import { redisClient } from '../config/redis';
import { Order, OrderStatus, OrderType } from '../models/order.model';
import { Logger } from '../utils/logger';

export class OrderService {
  private readonly ACTIVE_ORDERS_KEY_PREFIX = 'order:active:';
  private readonly ORDER_TTL = 3600; // 1 hour

  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const query = `
      INSERT INTO orders (
        id, order_type, token_in, token_out, amount_in, 
        status, retry_count, created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      order.orderType,
      order.tokenIn,
      order.tokenOut,
      order.amountIn,
      order.status,
      order.retryCount || 0,
    ];

    try {
      const result = await database.query(query, values);
      const createdOrder = this.mapRowToOrder(result.rows[0]);

      // Store in Redis for quick access
      await this.cacheActiveOrder(createdOrder);

      Logger.info('Order created', { orderId: createdOrder.id });
      return createdOrder;
    } catch (error) {
      Logger.error('Failed to create order', error);
      throw error;
    }
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    // Try Redis cache first
    const cached = await this.getCachedOrder(orderId);
    if (cached) {
      return cached;
    }

    // Fallback to database
    const query = 'SELECT * FROM orders WHERE id = $1';
    try {
      const result = await database.query(query, [orderId]);
      if (result.rows.length === 0) {
        return null;
      }

      const order = this.mapRowToOrder(result.rows[0]);

      // Cache if still active
      if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.FAILED) {
        await this.cacheActiveOrder(order);
      }

      return order;
    } catch (error) {
      Logger.error('Failed to get order', error);
      throw error;
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    updates?: Partial<Order>
  ): Promise<void> {
    const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
    const values: any[] = [status];
    let paramIndex = 2;

    if (updates?.selectedDex) {
      updateFields.push(`selected_dex = $${paramIndex++}`);
      values.push(updates.selectedDex);
    }

    if (updates?.raydiumQuote) {
      updateFields.push(`raydium_quote = $${paramIndex++}`);
      values.push(JSON.stringify(updates.raydiumQuote));
    }

    if (updates?.meteoraQuote) {
      updateFields.push(`meteora_quote = $${paramIndex++}`);
      values.push(JSON.stringify(updates.meteoraQuote));
    }

    if (updates?.routingDecision) {
      updateFields.push(`routing_decision = $${paramIndex++}`);
      values.push(JSON.stringify(updates.routingDecision));
    }

    if (updates?.executedPrice) {
      updateFields.push(`executed_price = $${paramIndex++}`);
      values.push(updates.executedPrice);
    }

    if (updates?.amountOut) {
      updateFields.push(`amount_out = $${paramIndex++}`);
      values.push(updates.amountOut);
    }

    if (updates?.txHash) {
      updateFields.push(`tx_hash = $${paramIndex++}`);
      values.push(updates.txHash);
    }

    if (updates?.errorMessage) {
      updateFields.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }

    if (updates?.retryCount !== undefined) {
      updateFields.push(`retry_count = $${paramIndex++}`);
      values.push(updates.retryCount);
    }

    if (status === OrderStatus.CONFIRMED || status === OrderStatus.FAILED) {
      updateFields.push(`completed_at = NOW()`);
    }

    values.push(orderId);

    const query = `
      UPDATE orders 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    try {
      await database.query(query, values);

      // Update cache
      const order = await this.getOrderById(orderId);
      if (order) {
        if (status === OrderStatus.CONFIRMED || status === OrderStatus.FAILED) {
          await this.removeCachedOrder(orderId);
        } else {
          await this.cacheActiveOrder(order);
        }
      }

      // Add to order history
      await this.addOrderHistory(orderId, status, updates);

      Logger.info('Order status updated', { orderId, status });
    } catch (error) {
      Logger.error('Failed to update order status', error);
      throw error;
    }
  }

  async incrementRetryCount(orderId: string): Promise<number> {
    const query = `
      UPDATE orders 
      SET retry_count = retry_count + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING retry_count
    `;

    try {
      const result = await database.query(query, [orderId]);
      const retryCount = result.rows[0].retry_count;
      Logger.info('Retry count incremented', { orderId, retryCount });
      return retryCount;
    } catch (error) {
      Logger.error('Failed to increment retry count', error);
      throw error;
    }
  }

  private async addOrderHistory(
    orderId: string,
    status: OrderStatus,
    metadata?: any
  ): Promise<void> {
    const query = `
      INSERT INTO order_history (order_id, status, message, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;

    const message = this.getStatusMessage(status);
    const values = [orderId, status, message, metadata ? JSON.stringify(metadata) : null];

    try {
      await database.query(query, values);
    } catch (error) {
      Logger.error('Failed to add order history', error);
      // Don't throw - history is not critical
    }
  }

  private getStatusMessage(status: OrderStatus): string {
    const messages: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Order received and queued',
      [OrderStatus.ROUTING]: 'Comparing DEX prices',
      [OrderStatus.BUILDING]: 'Creating transaction',
      [OrderStatus.SUBMITTED]: 'Transaction sent to network',
      [OrderStatus.CONFIRMED]: 'Transaction successful',
      [OrderStatus.FAILED]: 'Order execution failed',
    };
    return messages[status] || 'Unknown status';
  }

  private async cacheActiveOrder(order: Order): Promise<void> {
    const key = `${this.ACTIVE_ORDERS_KEY_PREFIX}${order.id}`;
    await redisClient.set(key, JSON.stringify(order), this.ORDER_TTL);
  }

  private async getCachedOrder(orderId: string): Promise<Order | null> {
    const key = `${this.ACTIVE_ORDERS_KEY_PREFIX}${orderId}`;
    const cached = await redisClient.get(key);
    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as Order;
    } catch (error) {
      Logger.error('Failed to parse cached order', error);
      return null;
    }
  }

  private async removeCachedOrder(orderId: string): Promise<void> {
    const key = `${this.ACTIVE_ORDERS_KEY_PREFIX}${orderId}`;
    await redisClient.del(key);
  }

  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      orderType: row.order_type as OrderType,
      tokenIn: row.token_in,
      tokenOut: row.token_out,
      amountIn: parseFloat(row.amount_in),
      status: row.status as OrderStatus,
      selectedDex: row.selected_dex || undefined,
      raydiumQuote: row.raydium_quote || undefined,
      meteoraQuote: row.meteora_quote || undefined,
      routingDecision: row.routing_decision || undefined,
      executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
      amountOut: row.amount_out ? parseFloat(row.amount_out) : undefined,
      txHash: row.tx_hash || undefined,
      errorMessage: row.error_message || undefined,
      retryCount: row.retry_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
    };
  }
}
