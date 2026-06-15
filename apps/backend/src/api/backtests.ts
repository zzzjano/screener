import { FastifyPluginAsync } from 'fastify';
import { BacktestExitKind, BacktestStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getDemoUserId } from '../lib/auth';
import { validateRuleTree } from '../server/rules/validator';
import { backtestRunQueue } from '../server/jobs/queues';

const backtestsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const userId = await getDemoUserId();
    const runs = await prisma.backtestRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    return reply.send({ runs });
  });

  fastify.post('/', async (request, reply) => {
    const userId = await getDemoUserId();
    const body = request.body as {
      name?: string;
      screenerId?: string;
      ruleTree: unknown;
      symbols: string[];
      timeframes: string[];
      startTime: string;
      endTime: string;
      exitConfig: { kind: BacktestExitKind; takeProfitPct?: number; stopLossPct?: number; maxBars?: number };
    };

    const tree = validateRuleTree(body.ruleTree);
    if (!body?.exitConfig?.kind) {
      return reply.status(400).send({ error: "Backtest wymaga strategii wyjścia." });
    }

    const run = await prisma.backtestRun.create({
      data: {
        userId,
        screenerId: body.screenerId,
        name: body.name,
        ruleTree: tree as unknown as Prisma.InputJsonValue,
        symbols: body.symbols,
        timeframes: body.timeframes,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        status: BacktestStatus.PENDING,
        exitKind: body.exitConfig.kind,
        exitConfig: body.exitConfig as unknown as Prisma.InputJsonValue,
      },
    });

    await backtestRunQueue.add("run", { backtestRunId: run.id }, { jobId: `backtest-${run.id}` });
    return reply.status(201).send({ run });
  });

  fastify.get('/:backtestId', async (request, reply) => {
    const userId = await getDemoUserId();
    const { backtestId } = request.params as { backtestId: string };
    const run = await prisma.backtestRun.findFirst({
      where: { id: backtestId, userId },
      include: { signals: { take: 100, orderBy: { signalTime: "asc" } } },
    });
    
    if (!run) {
      return reply.status(404).send({ error: "Nie znaleziono backtestu" });
    }
    
    return reply.send({ run });
  });
};

export default backtestsRoutes;
