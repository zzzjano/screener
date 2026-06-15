import { FastifyPluginAsync } from 'fastify';
import { getRedis } from '../lib/redis';
import { prisma } from '../lib/prisma';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    try {
      const redis = getRedis();
      await redis.ping();
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: "ok", service: "crypto-screener" });
    } catch (error) {
      return reply.status(503).send({ 
        status: "error", 
        message: error instanceof Error ? error.message : "unknown" 
      });
    }
  });
};

export default healthRoutes;
