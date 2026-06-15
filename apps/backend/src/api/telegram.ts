import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { getDemoUserId } from '../lib/auth';

const telegramRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', async (request, reply) => {
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

  fastify.delete('/', async (request, reply) => {
    const userId = await getDemoUserId();
    await prisma.telegramConnection.deleteMany({ where: { userId } });
    return reply.send({ ok: true });
  });

  fastify.post('/test', async (request, reply) => {
    const { env } = await import('../lib/env');
    const { sendTelegramMessage } = await import('../server/alerts/telegram-client');

    if (!env.TELEGRAM_BOT_TOKEN) {
      return reply.status(400).send({ error: "missing_bot_token" });
    }

    const userId = await getDemoUserId();
    const connection = await prisma.telegramConnection.findFirst({
      where: { userId, isEnabled: true },
    });

    if (!connection?.chatIdEncrypted) {
      return reply.status(400).send({ error: "missing_chat_id" });
    }

    try {
      await sendTelegramMessage(
        connection.chatIdEncrypted,
        "✅ Crypto Screener — test powiadomień Telegram działa.",
      );
      return reply.send({ ok: true });
    } catch (error) {
      return reply.status(500).send({ error: "failed_to_send" });
    }
  });
};

export default telegramRoutes;
