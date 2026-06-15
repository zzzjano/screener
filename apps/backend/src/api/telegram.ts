import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { getDemoUserId } from '../lib/auth';

const telegramRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/webhook', async (request, reply) => {
    const body = request.body as { chatId?: string; username?: string };
    if (!body?.chatId) {
      return reply.status(400).send({ error: "Brak chatId" });
    }

    const userId = await getDemoUserId();
    const existing = await prisma.telegramConnection.findFirst({ where: { userId } });

    if (existing) {
      await prisma.telegramConnection.update({
        where: { id: existing.id },
        data: { chatIdEncrypted: body.chatId, username: body.username, verifiedAt: new Date(), isEnabled: true },
      });
    } else {
      await prisma.telegramConnection.create({
        data: {
          userId,
          chatIdEncrypted: body.chatId,
          username: body.username,
          verifiedAt: new Date(),
          isEnabled: true,
        },
      });
    }

    return reply.send({ ok: true });
  });
};

export default telegramRoutes;
