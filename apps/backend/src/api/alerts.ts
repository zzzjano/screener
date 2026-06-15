import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { getDemoUserId } from '../lib/auth';

const alertsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const userId = await getDemoUserId();
    const alerts = await prisma.alert.findMany({
      where: { screener: { userId } },
      include: { 
        screener: { select: { name: true } }, 
        deliveries: { take: 5, orderBy: { createdAt: "desc" } } 
      },
    });
    return reply.send(alerts);
  });
};

export default alertsRoutes;
