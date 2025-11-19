import { Pool } from 'pg';
import { config } from '../config/config';

class Database {
  private pool: Pool;

  constructor() {
    // Use DATABASE_URL if provided (for Render deployment), otherwise use individual config
    if (config.database.url && config.database.url !== 'postgresql://postgres:postgres@localhost:5432/eterna_orders') {
      // Use connection string (preferred for production)
      this.pool = new Pool({
        connectionString: config.database.url,
        ssl: config.server.env === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    } else {
      // Use individual config (for local development)
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }

    this.pool.on('error', (err: Error) => {
      console.error('Unexpected database error:', err);
    });
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getClient() {
    return this.pool.connect();
  }

  async close() {
    await this.pool.end();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

export const database = new Database();
