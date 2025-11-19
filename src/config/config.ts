import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/eterna_orders',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'eterna_orders',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10', 10),
    maxRate: parseInt(process.env.QUEUE_MAX_RATE || '100', 10),
    rateLimitDuration: parseInt(process.env.QUEUE_RATE_LIMIT_DURATION || '60000', 10),
  },
  order: {
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
    retryBackoffBase: parseInt(process.env.RETRY_BACKOFF_BASE || '1000', 10),
    timeout: parseInt(process.env.ORDER_TIMEOUT || '30000', 10),
  },
  dex: {
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    network: process.env.SOLANA_NETWORK || 'devnet',
    useMock: process.env.USE_MOCK_DEX === 'true',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
