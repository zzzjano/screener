import { NextResponse } from "next/server";
import { BacktestExitKind, BacktestStatus, Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { getDemoUserId } from "@/src/lib/auth";
import { validateRuleTree } from "@/src/server/rules/validator";
import { backtestRunQueue } from "@/src/server/jobs/queues";

export async function GET() {
  const userId = await getDemoUserId();
  const runs = await prisma.backtestRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const userId = await getDemoUserId();
  const body = await request.json() as {
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
  if (!body.exitConfig?.kind) {
    return NextResponse.json({ error: "Backtest wymaga strategii wyjścia." }, { status: 400 });
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
  return NextResponse.json({ run }, { status: 201 });
}
