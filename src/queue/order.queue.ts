import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { config } from '../config/config';
import { Logger } from '../utils/logger';
import { OrderStatus } from '../models/order.model';
import { OrderService } from '../services/order.service';
import { MockDexRouter } from '../services/dex-router.service';
import { exponentialBackoff, calculatePriceDifference, calculatePriceDifferencePercent } from '../utils/helpers';
import { WebSocketManager } from '../websocket';

export interface OrderJob {
  orderId: string;
  orderType: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
}

export class OrderQueue {
  private queue: Queue<OrderJob>;
  private worker: Worker<OrderJob>;
  private orderService: OrderService;
  private dexRouter: MockDexRouter;
  private wsManager: WebSocketManager;

  constructor(wsManager: WebSocketManager) {
    this.orderService = new OrderService();
    this.dexRouter = new MockDexRouter();
    this.wsManager = wsManager;

    // Initialize queue
    this.queue = new Queue<OrderJob>('order-execution', {
      connection: redisClient.getClient(),
      defaultJobOptions: {
        attempts: config.order.maxRetryAttempts,
        backoff: {
          type: 'exponential',
          delay: config.order.retryBackoffBase,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });

    // Initialize worker
    this.worker = new Worker<OrderJob>(
      'order-execution',
      async (job: Job<OrderJob>) => {
        return await this.processOrder(job);
      },
      {
        connection: redisClient.getClient(),
        concurrency: config.queue.concurrency,
        limiter: {
          max: config.queue.maxRate,
          duration: config.queue.rateLimitDuration,
        },
      }
    );

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      Logger.info('Job completed', { jobId: job.id, orderId: job.data.orderId });
    });

    this.worker.on('failed', (job, err) => {
      Logger.error('Job failed', {
        jobId: job?.id,
        orderId: job?.data.orderId,
        error: err.message,
      });
    });

    this.worker.on('error', (err) => {
      Logger.error('Worker error', err);
    });

    this.queue.on('error', (err) => {
      Logger.error('Queue error', err);
    });
  }

  async addOrder(orderData: OrderJob): Promise<void> {
    try {
      await this.queue.add('execute-order', orderData, {
        jobId: orderData.orderId,
      });
      Logger.info('Order added to queue', { orderId: orderData.orderId });
    } catch (error) {
      Logger.error('Failed to add order to queue', error);
      throw error;
    }
  }

  private async processOrder(job: Job<OrderJob>): Promise<void> {
    const { orderId, tokenIn, tokenOut, amountIn } = job.data;

    try {
      Logger.info('Processing order', { orderId, attempt: job.attemptsMade + 1 });

      // Step 1: Update status to ROUTING
      await this.orderService.updateOrderStatus(orderId, OrderStatus.ROUTING);
      this.wsManager.sendStatusUpdate(orderId, OrderStatus.ROUTING, 'Comparing DEX prices');

      // Step 2: Get quotes from both DEXs
      const { bestQuote, allQuotes } = await this.dexRouter.getBestQuote(
        tokenIn,
        tokenOut,
        amountIn
      );

      const [raydiumQuote, meteoraQuote] = allQuotes;

      // Calculate routing decision
      const priceDiff = calculatePriceDifference(
        raydiumQuote.effectivePrice,
        meteoraQuote.effectivePrice
      );
      const priceDiffPercent = calculatePriceDifferencePercent(
        raydiumQuote.effectivePrice,
        meteoraQuote.effectivePrice
      );

      const routingDecision = {
        selectedDex: bestQuote.dex,
        reason: `${bestQuote.dex} offers better price by ${priceDiffPercent.toFixed(2)}%`,
        raydiumPrice: raydiumQuote.effectivePrice,
        meteoraPrice: meteoraQuote.effectivePrice,
        priceDifference: priceDiff,
        priceDifferencePercent: priceDiffPercent,
      };

      // Update order with routing info
      await this.orderService.updateOrderStatus(orderId, OrderStatus.ROUTING, {
        selectedDex: bestQuote.dex,
        raydiumQuote,
        meteoraQuote,
        routingDecision,
      });

      this.wsManager.sendStatusUpdate(
        orderId,
        OrderStatus.ROUTING,
        `Selected ${bestQuote.dex} for best price`,
        { selectedDex: bestQuote.dex, routingDecision }
      );

      // Step 3: Update status to BUILDING
      await this.orderService.updateOrderStatus(orderId, OrderStatus.BUILDING);
      this.wsManager.sendStatusUpdate(orderId, OrderStatus.BUILDING, 'Creating transaction');

      // Step 4: Execute swap
      const swapResult = await this.dexRouter.executeSwap(
        bestQuote.dex,
        tokenIn,
        tokenOut,
        amountIn,
        bestQuote.effectivePrice
      );

      if (!swapResult.success) {
        throw new Error(swapResult.error || 'Swap execution failed');
      }

      // Step 5: Update status to SUBMITTED
      await this.orderService.updateOrderStatus(orderId, OrderStatus.SUBMITTED, {
        txHash: swapResult.txHash,
      });
      this.wsManager.sendStatusUpdate(
        orderId,
        OrderStatus.SUBMITTED,
        'Transaction sent to network',
        { txHash: swapResult.txHash }
      );

      // Step 6: Update status to CONFIRMED
      await this.orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, {
        txHash: swapResult.txHash,
        executedPrice: swapResult.executedPrice,
        amountOut: swapResult.amountOut,
      });

      this.wsManager.sendStatusUpdate(
        orderId,
        OrderStatus.CONFIRMED,
        'Transaction successful',
        {
          txHash: swapResult.txHash,
          executedPrice: swapResult.executedPrice,
          amountOut: swapResult.amountOut,
        }
      );

      Logger.info('Order processed successfully', {
        orderId,
        txHash: swapResult.txHash,
        executedPrice: swapResult.executedPrice,
      });
    } catch (error: any) {
      Logger.error('Order processing failed', { orderId, error: error.message });

      // Increment retry count
      const retryCount = await this.orderService.incrementRetryCount(orderId);

      // Check if we should retry
      if (job.attemptsMade < config.order.maxRetryAttempts - 1) {
        const delay = exponentialBackoff(job.attemptsMade, config.order.retryBackoffBase);
        Logger.warn('Retrying order', {
          orderId,
          attempt: job.attemptsMade + 1,
          nextRetryIn: delay,
        });
        throw error; // Let BullMQ handle retry
      } else {
        // Final failure
        await this.orderService.updateOrderStatus(orderId, OrderStatus.FAILED, {
          errorMessage: error.message,
          retryCount,
        });

        this.wsManager.sendStatusUpdate(orderId, OrderStatus.FAILED, 'Order execution failed', {
          error: error.message,
        });

        Logger.error('Order failed after all retries', { orderId, retryCount });
      }
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    Logger.info('Order queue closed');
  }

  async getQueueMetrics() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
