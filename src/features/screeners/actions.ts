"use server";

import { prisma } from "@/src/lib/prisma";
import { getDemoUserId } from "@/src/lib/auth";
import { validateRuleTree, hashRuleTree, compileDependencies } from "@/src/server/rules/validator";
import { registerScreenerDependencies } from "@/src/server/jobs/processors/websocket-ingest.processor";
import { backfillQueue } from "@/src/server/jobs/queues";
import { ScreenerStatus, MarketType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { RuleTree } from "@/src/server/rules/ast";

export interface CreateScreenerInput {
  name: string;
  description?: string;
  symbols: string[];
  timeframes: string[];
  ruleTree: RuleTree;
  marketType?: MarketType;
  quoteAsset?: string;
}

export async function createScreener(input: CreateScreenerInput) {
  const userId = await getDemoUserId();
  const tree = validateRuleTree(input.ruleTree);
  const deps = compileDependencies(tree, input.symbols, input.timeframes);

  const screener = await prisma.screener.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      symbols: input.symbols,
      timeframes: input.timeframes,
      ruleTree: tree as unknown as Prisma.InputJsonValue,
      ruleTreeHash: hashRuleTree(tree),
      compiledDependencies: deps as unknown as Prisma.InputJsonValue,
      marketType: input.marketType ?? MarketType.LINEAR,
      quoteAsset: input.quoteAsset ?? "USDT",
      alerts: { create: { isEnabled: true, telegramEnabled: true } },
    },
  });

  revalidatePath("/screenery");
  return screener;
}

export async function updateScreener(id: string, input: Partial<CreateScreenerInput>) {
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
      timeframes: input.timeframes,
      ruleTree: tree ? (tree as unknown as Prisma.InputJsonValue) : undefined,
      ruleTreeHash: tree ? hashRuleTree(tree) : undefined,
      compiledDependencies: deps ? (deps as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  revalidatePath("/screenery");
  revalidatePath(`/screenery/${id}`);
  return screener;
}

export async function activateScreener(id: string) {
  const screener = await prisma.screener.update({
    where: { id },
    data: { status: ScreenerStatus.ACTIVE },
  });

  const deps = compileDependencies(
    validateRuleTree(screener.ruleTree),
    screener.symbols,
    screener.timeframes,
  );

  await registerScreenerDependencies(
    screener.id,
    screener.marketType,
    screener.symbols,
    deps.timeframes,
  );

  for (const symbol of screener.symbols) {
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

  revalidatePath("/screenery");
  return screener;
}

export async function pauseScreener(id: string) {
  const screener = await prisma.screener.update({
    where: { id },
    data: { status: ScreenerStatus.PAUSED },
  });
  revalidatePath("/screenery");
  return screener;
}

export async function deleteScreener(id: string) {
  await prisma.screener.delete({ where: { id } });
  revalidatePath("/screenery");
}

export async function listScreeners() {
  const userId = await getDemoUserId();
  return prisma.screener.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { matches: true } },
      alerts: true,
    },
  });
}

export async function getScreener(id: string) {
  return prisma.screener.findUnique({
    where: { id },
    include: {
      matches: { orderBy: { createdAt: "desc" }, take: 20 },
      alerts: true,
    },
  });
}
