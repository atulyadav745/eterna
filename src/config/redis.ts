import Redis from 'ioredis';
import { config } from '../config/config';

class RedisClient {
  private client: Redis;

  constructor() {
    // If REDIS_PASSWORD contains a full connection string (redis://...), use it
    // Otherwise use individual host/port/password
    const redisPassword = config.redis.password;
    
    if (redisPassword && redisPassword.startsWith('redis://')) {
      // Use connection string
      this.client = new Redis(redisPassword, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: true,
        connectTimeout: 10000,
      });
    } else {
      // Use individual config
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: redisPassword,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: true,
        connectTimeout: 10000,
      });
    }

    this.client.on('error', (err: Error) => {
      console.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
    });

    this.client.on('ready', () => {
      console.log('Redis ready');
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (expirySeconds) {
      await this.client.setex(key, expirySeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

export const redisClient = new RedisClient();
