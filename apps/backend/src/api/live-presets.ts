import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { getDemoUserId } from '../lib/auth';

const livePresetsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const userId = await getDemoUserId();
    const presets = await prisma.liveScreenerPreset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ presets });
  });

  fastify.post('/', async (request, reply) => {
    const userId = await getDemoUserId();
    const body = request.body as { name?: string; ruleTree?: unknown };
    
    if (!body?.name || !body?.ruleTree) {
      return reply.status(400).send({ error: "Brak nazwy lub reguł" });
    }

    const preset = await prisma.liveScreenerPreset.create({
      data: {
        userId,
        name: body.name,
        ruleTree: body.ruleTree as any,
      },
    });

    return reply.status(201).send({ preset });
  });

  fastify.delete('/:id', async (request, reply) => {
    const userId = await getDemoUserId();
    const { id } = request.params as { id: string };

    await prisma.liveScreenerPreset.deleteMany({
      where: { id, userId },
    });

    return reply.send({ ok: true });
  });
};

export default livePresetsRoutes;
