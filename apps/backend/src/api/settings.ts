import { FastifyPluginAsync } from 'fastify';
import { getDemoUserId } from '../lib/auth';
import {
  createBybitCredential,
  listCredentialMetadata,
  disableCredential
} from '../server/exchanges/credential-service';
import { redactCredentialError } from '../server/security/redaction';

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/bybit-credentials', async (request, reply) => {
    const userId = await getDemoUserId();
    const credentials = await listCredentialMetadata(userId);
    return reply.send({ credentials });
  });

  fastify.post('/bybit-credentials', async (request, reply) => {
    const userId = await getDemoUserId();
    const body = request.body as { label?: string; apiKey?: string; apiSecret?: string };
    
    if (!body?.apiKey || !body?.apiSecret) {
      return reply.status(400).send({ error: "Brak API key lub API secret" });
    }

    try {
      const credential = await createBybitCredential({
        userId,
        apiKey: body.apiKey,
        apiSecret: body.apiSecret,
        label: body.label,
      });
      return reply.status(201).send({ credential });
    } catch (error) {
      return reply.status(400).send({ error: redactCredentialError(error) });
    }
  });

  fastify.delete('/bybit-credentials/:credentialId', async (request, reply) => {
    const userId = await getDemoUserId();
    const { credentialId } = request.params as { credentialId: string };
    await disableCredential(userId, credentialId);
    return reply.send({ ok: true });
  });
};

export default settingsRoutes;
