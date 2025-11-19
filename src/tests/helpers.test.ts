import {
  sleep,
  generateMockTxHash,
  calculateEffectivePrice,
  calculatePriceDifference,
  calculatePriceDifferencePercent,
  exponentialBackoff,
} from '../utils/helpers';

describe('Helper Functions', () => {
  describe('sleep', () => {
    it('should delay execution for specified milliseconds', async () => {
      const startTime = Date.now();
      await sleep(100);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(150);
    });
  });

  describe('generateMockTxHash', () => {
    it('should generate a valid transaction hash', () => {
      const txHash = generateMockTxHash();

      expect(txHash).toBeDefined();
      expect(txHash.length).toBe(88);
      expect(/^[1-9A-HJ-NP-Za-km-z]+$/.test(txHash)).toBe(true);
    });

    it('should generate unique hashes', () => {
      const hash1 = generateMockTxHash();
      const hash2 = generateMockTxHash();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('calculateEffectivePrice', () => {
    it('should calculate effective price with fee', () => {
      const price = 100;
      const fee = 0.01; // 1%

      const effectivePrice = calculateEffectivePrice(price, fee);

      expect(effectivePrice).toBe(101);
    });

    it('should handle zero fee', () => {
      const price = 100;
      const fee = 0;

      const effectivePrice = calculateEffectivePrice(price, fee);

      expect(effectivePrice).toBe(100);
    });
  });

  describe('calculatePriceDifference', () => {
    it('should calculate absolute price difference', () => {
      const price1 = 100;
      const price2 = 95;

      const difference = calculatePriceDifference(price1, price2);

      expect(difference).toBe(5);
    });

    it('should return positive value regardless of order', () => {
      const diff1 = calculatePriceDifference(100, 95);
      const diff2 = calculatePriceDifference(95, 100);

      expect(diff1).toBe(diff2);
    });
  });

  describe('calculatePriceDifferencePercent', () => {
    it('should calculate percentage difference correctly', () => {
      const price1 = 100;
      const price2 = 95;

      const percent = calculatePriceDifferencePercent(price1, price2);

      expect(percent).toBeCloseTo(5.13, 1);
    });

    it('should return 0 for identical prices', () => {
      const percent = calculatePriceDifferencePercent(100, 100);

      expect(percent).toBe(0);
    });
  });

  describe('exponentialBackoff', () => {
    it('should calculate backoff for first attempt', () => {
      const backoff = exponentialBackoff(0, 1000);

      expect(backoff).toBe(1000);
    });

    it('should double backoff for each attempt', () => {
      const backoff1 = exponentialBackoff(0, 1000);
      const backoff2 = exponentialBackoff(1, 1000);
      const backoff3 = exponentialBackoff(2, 1000);

      expect(backoff1).toBe(1000);
      expect(backoff2).toBe(2000);
      expect(backoff3).toBe(4000);
    });

    it('should cap backoff at 10 seconds', () => {
      const backoff = exponentialBackoff(10, 1000);

      expect(backoff).toBe(10000);
    });
  });
});
