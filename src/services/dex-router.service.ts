import { DexType, DexQuote } from '../models/order.model';
import { Logger } from '../utils/logger';
import { sleep, calculateEffectivePrice } from '../utils/helpers';

export interface IDexRouter {
  getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote>;
  getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote>;
  getBestQuote(tokenIn: string, tokenOut: string, amount: number): Promise<{
    bestQuote: DexQuote;
    allQuotes: DexQuote[];
  }>;
}

export class MockDexRouter implements IDexRouter {
  private getBasePrice(tokenIn: string, tokenOut: string): number {
    // Simulate base prices for different token pairs
    const pairs: Record<string, number> = {
      'SOL-USDC': 25.5,
      'SOL-USDT': 25.48,
      'USDC-USDT': 1.0,
      'RAY-USDC': 0.85,
      'MNGO-USDC': 0.15,
    };

    const key = `${tokenIn}-${tokenOut}`;
    const reverseKey = `${tokenOut}-${tokenIn}`;

    if (pairs[key]) {
      return pairs[key];
    } else if (pairs[reverseKey]) {
      return 1 / pairs[reverseKey];
    }

    // Default price for unknown pairs
    return 1.0;
  }

  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    Logger.debug('Fetching Raydium quote', { tokenIn, tokenOut, amount });

    // Simulate network delay (200ms)
    await sleep(200);

    const basePrice = this.getBasePrice(tokenIn, tokenOut);

    // Raydium: Add 2-4% variance to base price
    const variance = 0.98 + Math.random() * 0.04; // 0.98 to 1.02
    const price = basePrice * variance;

    // Raydium fee: 0.3%
    const fee = 0.003;
    const effectivePrice = calculateEffectivePrice(price, fee);

    const quote: DexQuote = {
      dex: DexType.RAYDIUM,
      price,
      fee,
      effectivePrice,
      liquidity: 1000000 + Math.random() * 5000000, // Mock liquidity
      priceImpact: 0.001 + Math.random() * 0.005, // 0.1-0.6%
      timestamp: new Date(),
    };

    Logger.info('Raydium quote fetched', {
      price: quote.price.toFixed(4),
      effectivePrice: quote.effectivePrice.toFixed(4),
      fee: `${(quote.fee * 100).toFixed(2)}%`,
    });

    return quote;
  }

  async getMeteoraQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    Logger.debug('Fetching Meteora quote', { tokenIn, tokenOut, amount });

    // Simulate network delay (200ms)
    await sleep(200);

    const basePrice = this.getBasePrice(tokenIn, tokenOut);

    // Meteora: Add 3-5% variance to base price (slightly different from Raydium)
    const variance = 0.97 + Math.random() * 0.05; // 0.97 to 1.02
    const price = basePrice * variance;

    // Meteora fee: 0.2% (lower than Raydium)
    const fee = 0.002;
    const effectivePrice = calculateEffectivePrice(price, fee);

    const quote: DexQuote = {
      dex: DexType.METEORA,
      price,
      fee,
      effectivePrice,
      liquidity: 800000 + Math.random() * 4000000, // Mock liquidity
      priceImpact: 0.0008 + Math.random() * 0.004, // 0.08-0.48%
      timestamp: new Date(),
    };

    Logger.info('Meteora quote fetched', {
      price: quote.price.toFixed(4),
      effectivePrice: quote.effectivePrice.toFixed(4),
      fee: `${(quote.fee * 100).toFixed(2)}%`,
    });

    return quote;
  }

  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<{ bestQuote: DexQuote; allQuotes: DexQuote[] }> {
    Logger.info('Comparing DEX quotes', { tokenIn, tokenOut, amount });

    // Fetch quotes from both DEXs in parallel
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount),
    ]);

    const allQuotes = [raydiumQuote, meteoraQuote];

    // Select the DEX with the lower effective price (better for buyer)
    const bestQuote =
      raydiumQuote.effectivePrice <= meteoraQuote.effectivePrice
        ? raydiumQuote
        : meteoraQuote;

    const priceDiff = Math.abs(raydiumQuote.effectivePrice - meteoraQuote.effectivePrice);
    const priceDiffPercent =
      (priceDiff / Math.min(raydiumQuote.effectivePrice, meteoraQuote.effectivePrice)) * 100;

    Logger.info('DEX comparison complete', {
      selectedDex: bestQuote.dex,
      raydiumEffectivePrice: raydiumQuote.effectivePrice.toFixed(4),
      meteoraEffectivePrice: meteoraQuote.effectivePrice.toFixed(4),
      priceDifference: priceDiff.toFixed(4),
      priceDifferencePercent: priceDiffPercent.toFixed(2) + '%',
      savings: `${priceDiffPercent.toFixed(2)}%`,
    });

    return { bestQuote, allQuotes };
  }

  async executeSwap(
    dex: DexType,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    expectedPrice: number
  ): Promise<{
    success: boolean;
    txHash?: string;
    executedPrice?: number;
    amountOut?: number;
    error?: string;
  }> {
    Logger.info('Executing swap', { dex, tokenIn, tokenOut, amountIn, expectedPrice });

    try {
      // Simulate transaction building and submission (2-3 seconds)
      const executionTime = 2000 + Math.random() * 1000;
      await sleep(executionTime);

      // Simulate 5% failure rate for realistic testing
      if (Math.random() < 0.05) {
        throw new Error('Transaction simulation failed: Insufficient liquidity');
      }

      // Generate mock transaction hash
      const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let txHash = '';
      for (let i = 0; i < 88; i++) {
        txHash += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Simulate slight price movement (±0.5% slippage)
      const slippage = 0.995 + Math.random() * 0.01; // 0.5% slippage
      const executedPrice = expectedPrice * slippage;
      const amountOut = amountIn / executedPrice;

      Logger.info('Swap executed successfully', {
        txHash,
        executedPrice: executedPrice.toFixed(4),
        amountOut: amountOut.toFixed(4),
        slippage: ((1 - slippage) * 100).toFixed(2) + '%',
      });

      return {
        success: true,
        txHash,
        executedPrice,
        amountOut,
      };
    } catch (error: any) {
      Logger.error('Swap execution failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
