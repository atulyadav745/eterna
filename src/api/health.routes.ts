import { FastifyInstance } from 'fastify';
import { database } from '../config/database';
import { redisClient } from '../config/redis';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    const dbHealth = await database.healthCheck();
    const redisHealth = await redisClient.healthCheck();

    const status = dbHealth && redisHealth ? 'healthy' : 'unhealthy';
    const statusCode = status === 'healthy' ? 200 : 503;

    return reply.code(statusCode).send({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        redis: redisHealth ? 'healthy' : 'unhealthy',
      },
    });
  });

  fastify.get('/api/health', async (_request, reply) => {
    return reply.redirect('/health');
  });
}
