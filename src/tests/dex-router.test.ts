import { MockDexRouter } from '../services/dex-router.service';
import { DexType } from '../models/order.model';

describe('MockDexRouter', () => {
  let dexRouter: MockDexRouter;

  beforeEach(() => {
    dexRouter = new MockDexRouter();
  });

  describe('getRaydiumQuote', () => {
    it('should return a valid Raydium quote', async () => {
      const quote = await dexRouter.getRaydiumQuote('SOL', 'USDC', 1.0);

      expect(quote.dex).toBe(DexType.RAYDIUM);
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.fee).toBe(0.003);
      expect(quote.effectivePrice).toBeGreaterThan(quote.price);
      expect(quote.liquidity).toBeGreaterThan(0);
      expect(quote.timestamp).toBeInstanceOf(Date);
    });

    it('should simulate network delay', async () => {
      const startTime = Date.now();
      await dexRouter.getRaydiumQuote('SOL', 'USDC', 1.0);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(150);
    });

    it('should return different prices on multiple calls', async () => {
      const quote1 = await dexRouter.getRaydiumQuote('SOL', 'USDC', 1.0);
      const quote2 = await dexRouter.getRaydiumQuote('SOL', 'USDC', 1.0);

      // Prices should vary slightly due to randomness
      expect(quote1.price).not.toBe(quote2.price);
    });
  });

  describe('getMeteoraQuote', () => {
    it('should return a valid Meteora quote', async () => {
      const quote = await dexRouter.getMeteoraQuote('SOL', 'USDC', 1.0);

      expect(quote.dex).toBe(DexType.METEORA);
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.fee).toBe(0.002);
      expect(quote.effectivePrice).toBeGreaterThan(quote.price);
      expect(quote.liquidity).toBeGreaterThan(0);
      expect(quote.timestamp).toBeInstanceOf(Date);
    });

    it('should have lower fees than Raydium', async () => {
      const raydiumQuote = await dexRouter.getRaydiumQuote('SOL', 'USDC', 1.0);
      const meteoraQuote = await dexRouter.getMeteoraQuote('SOL', 'USDC', 1.0);

      expect(meteoraQuote.fee).toBeLessThan(raydiumQuote.fee);
    });
  });

  describe('getBestQuote', () => {
    it('should select the DEX with better effective price', async () => {
      const result = await dexRouter.getBestQuote('SOL', 'USDC', 1.0);

      expect(result.bestQuote).toBeDefined();
      expect([DexType.RAYDIUM, DexType.METEORA]).toContain(result.bestQuote.dex);
      expect(result.allQuotes).toHaveLength(2);
      expect(result.bestQuote.effectivePrice).toBeGreaterThan(0);
    });

    it('should return both Raydium and Meteora quotes', async () => {
      const result = await dexRouter.getBestQuote('SOL', 'USDC', 1.0);

      const dexTypes = result.allQuotes.map((q) => q.dex);
      expect(dexTypes).toContain(DexType.RAYDIUM);
      expect(dexTypes).toContain(DexType.METEORA);
    });

    it('should select the quote with lower effective price', async () => {
      const result = await dexRouter.getBestQuote('SOL', 'USDC', 1.0);

      const otherQuote = result.allQuotes.find((q) => q.dex !== result.bestQuote.dex);
      expect(result.bestQuote.effectivePrice).toBeLessThanOrEqual(
        otherQuote?.effectivePrice || Infinity
      );
    });
  });

  describe('executeSwap', () => {
    it('should successfully execute a swap', async () => {
      const result = await dexRouter.executeSwap(DexType.METEORA, 'SOL', 'USDC', 1.0, 25.5);

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.txHash?.length).toBe(88);
      expect(result.executedPrice).toBeGreaterThan(0);
      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('should simulate execution delay', async () => {
      const startTime = Date.now();
      await dexRouter.executeSwap(DexType.RAYDIUM, 'SOL', 'USDC', 1.0, 25.5);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(2000);
      expect(duration).toBeLessThanOrEqual(3500);
    });

    it('should calculate slippage correctly', async () => {
      const expectedPrice = 25.5;
      const result = await dexRouter.executeSwap(DexType.METEORA, 'SOL', 'USDC', 1.0, expectedPrice);

      if (result.executedPrice) {
        const slippage = ((result.executedPrice - expectedPrice) / expectedPrice) * 100;
        expect(Math.abs(slippage)).toBeLessThan(1); // Slippage should be < 1%
      }
    });
  });
});
