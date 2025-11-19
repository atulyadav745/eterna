export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const generateMockTxHash = (): string => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let hash = '';
  for (let i = 0; i < 88; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
};

export const calculateEffectivePrice = (price: number, fee: number): number => {
  return price * (1 + fee);
};

export const calculatePriceDifference = (price1: number, price2: number): number => {
  return Math.abs(price1 - price2);
};

export const calculatePriceDifferencePercent = (price1: number, price2: number): number => {
  const avg = (price1 + price2) / 2;
  return (Math.abs(price1 - price2) / avg) * 100;
};

export const exponentialBackoff = (attempt: number, baseDelay: number): number => {
  return Math.min(baseDelay * Math.pow(2, attempt), 10000);
};
