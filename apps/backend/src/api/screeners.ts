import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { getDemoUserId } from '../lib/auth';
import { validateRuleTree, hashRuleTree, compileDependencies } from '../server/rules/validator';
import { registerScreenerDependencies } from '../server/jobs/processors/websocket-ingest.processor';
import { backfillQueue, liveScanQueue } from '../server/jobs/queues';
import { ScreenerStatus, MarketType, Prisma } from '@prisma/client';
import crypto from 'crypto';
import type { RuleTree } from '../server/rules/ast';

const screenersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const userId = await getDemoUserId();
    const screeners = await prisma.screener.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { matches: true } },
        alerts: true,
      },
    });
    return reply.send(screeners);
  });

  fastify.post('/', async (request, reply) => {
    const userId = await getDemoUserId();
    const input = request.body as any;
    
    const tree = validateRuleTree(input.ruleTree);
    const deps = compileDependencies(tree, input.symbols, input.timeframes);

    const screener = await prisma.screener.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        symbols: input.symbols,
        scanAll: input.scanAll,
        timeframes: input.timeframes,
        ruleTree: tree as unknown as Prisma.InputJsonValue,
        ruleTreeHash: hashRuleTree(tree),
        compiledDependencies: deps as unknown as Prisma.InputJsonValue,
        marketType: input.marketType ?? MarketType.LINEAR,
        quoteAsset: input.quoteAsset ?? "USDT",
        cooldownSeconds: input.cooldownSeconds ?? 900,
        alerts: { create: { isEnabled: true, telegramEnabled: true, cooldownSeconds: input.cooldownSeconds ?? 900 } },
      },
    });

    return reply.status(201).send(screener);
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const screener = await prisma.screener.findUnique({
      where: { id },
      include: {
        matches: { orderBy: { createdAt: "desc" }, take: 20 },
        alerts: true,
      },
    });
    if (!screener) return reply.status(404).send({ error: "Nie znaleziono" });
    return reply.send(screener);
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = request.body as any;
    
    const tree = input.ruleTree ? validateRuleTree(input.ruleTree) : undefined;
    const deps = tree && input.symbols
      ? compileDependencies(tree, input.symbols, input.timeframes ?? [])
      : undefined;

    const screener = await prisma.screener.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        symbols: input.symbols,
        scanAll: input.scanAll,
        timeframes: input.timeframes,
        ruleTree: tree ? (tree as unknown as Prisma.InputJsonValue) : undefined,
        ruleTreeHash: tree ? hashRuleTree(tree) : undefined,
        compiledDependencies: deps ? (deps as unknown as Prisma.InputJsonValue) : undefined,
        cooldownSeconds: input.cooldownSeconds,
      },
    });

    if (input.cooldownSeconds !== undefined) {
      await prisma.alert.updateMany({
        where: { screenerId: id },
        data: { cooldownSeconds: input.cooldownSeconds },
      });
    }

    return reply.send(screener);
  });

  fastify.post('/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const screener = await prisma.screener.update({
      where: { id },
      data: { status: ScreenerStatus.ACTIVE },
    });

    let symbolsToScan = screener.symbols;
    if (screener.scanAll) {
      const allMarkets = await prisma.market.findMany({
        where: { type: screener.marketType, isActive: true },
        select: { symbol: true },
      });
      symbolsToScan = allMarkets.map((m) => m.symbol);
    }

    const deps = compileDependencies(
      validateRuleTree(screener.ruleTree as RuleTree),
      symbolsToScan,
      screener.timeframes,
    );

    await registerScreenerDependencies(
      screener.id,
      screener.marketType,
      symbolsToScan,
      deps.timeframes,
    );

    for (const symbol of symbolsToScan) {
      for (const timeframe of deps.timeframes) {
        await backfillQueue.add("activate", {
          marketType: screener.marketType,
          symbol,
          timeframe,
          requiredBars: deps.maxWarmupBars,
          evaluateAfter: true,
        });
      }
    }

    return reply.send(screener);
  });

  fastify.post('/:id/pause', async (request, reply) => {
    const { id } = request.params as { id: string };
    const screener = await prisma.screener.update({
      where: { id },
      data: { status: ScreenerStatus.PAUSED },
    });
    return reply.send(screener);
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.screener.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // Moved from index.ts
  fastify.post('/live', async (request, reply) => {
    try {
      const body = request.body as { ruleTree?: unknown };
      if (!body?.ruleTree) {
        return reply.status(400).send({ error: "Brak ruleTree" });
      }

      const jobId = crypto.randomUUID();
      await liveScanQueue.add("run", { ruleTree: body.ruleTree }, { jobId });

      return reply.status(202).send({ jobId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Błąd skanowania";
      return reply.status(500).send({ error: message });
    }
  });

  fastify.get('/live/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    try {
      const job = await liveScanQueue.getJob(jobId);
      if (!job) {
        return reply.status(404).send({ error: "Job not found" });
      }

      const state = await job.getState();
      if (state === "completed") {
        return reply.send({ status: "completed", results: job.returnvalue });
      } else if (state === "failed") {
        return reply.send({ status: "failed", error: job.failedReason });
      } else {
        return reply.send({ status: state });
      }
    } catch (error) {
      return reply.status(500).send({ error: "Błąd pobierania zadania" });
    }
  });
};

export default screenersRoutes;
