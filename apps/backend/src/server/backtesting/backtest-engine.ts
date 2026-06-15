import { BacktestStatus, Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { getHistoricalCandles } from "./historical-candle-store";
import type { BacktestExitConfig, BacktestMetrics } from "./types";
import { validateRuleTree } from "../rules/validator";
import { evaluateRuleTreeForScan, type ScanEvalContext } from "../screeners/scan-evaluator";
import { InlineIndicatorExecutionEngine } from "../indicators/indicator-execution-engine";
import { resolveExit } from "./exit-strategy";
import type { Candle } from "../indicators/indicator-types";

export async function runBacktest(backtestRunId: string): Promise<BacktestMetrics> {
  const run = await prisma.backtestRun.update({
    where: { id: backtestRunId },
    data: { status: BacktestStatus.RUNNING, startedAt: new Date() },
  });

  const tree = validateRuleTree(run.ruleTree);
  const exitConfig = run.exitConfig as unknown as BacktestExitConfig;
  const signals: Array<{ pnlPct: number }> = [];

  try {
    for (const symbol of run.symbols) {
      const candlesByTf = new Map<string, Candle[]>();
      for (const timeframe of run.timeframes) {
        candlesByTf.set(
          timeframe,
          await getHistoricalCandles({
            marketType: "LINEAR",
            symbol,
            timeframe,
            startTime: run.startTime,
            endTime: run.endTime,
          }),
        );
      }

      const primaryTimeframe = run.timeframes[0] ?? "15m";
      const primary = candlesByTf.get(primaryTimeframe) ?? [];
      for (let index = 50; index < primary.length - 1; index++) {
        const ctx = buildHistoricalContext(symbol, "LINEAR", candlesByTf, primary[index].T);
        const result = await evaluateRuleTreeForScan(tree, ctx);
        if (!result.passed) continue;

        const exit = resolveExit(primary, index, exitConfig);
        if (!exit) continue;
        signals.push({ pnlPct: exit.pnlPct });
        await prisma.backtestSignal.create({
          data: {
            runId: run.id,
            symbol,
            timeframe: primaryTimeframe,
            signalTime: new Date(primary[index].T),
            entryPrice: new Prisma.Decimal(primary[index].c),
            exitTime: new Date(exit.exitTime),
            exitPrice: new Prisma.Decimal(exit.exitPrice),
            pnlPct: new Prisma.Decimal(exit.pnlPct),
            maxAdverseExcursionPct: new Prisma.Decimal(exit.maxAdverseExcursionPct),
            maxFavorableExcursionPct: new Prisma.Decimal(exit.maxFavorableExcursionPct),
            snapshot: result.snapshots as unknown as Prisma.InputJsonValue,
          },
        });
        index = exit.exitIndex;
      }
    }

    const metrics = calculateMetrics(signals);
    await prisma.backtestRun.update({
      where: { id: backtestRunId },
      data: {
        status: BacktestStatus.COMPLETED,
        metrics: metrics as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    return metrics;
  } catch (error) {
    await prisma.backtestRun.update({
      where: { id: backtestRunId },
      data: {
        status: BacktestStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

function buildHistoricalContext(
  symbol: string,
  marketType: string,
  candlesByTf: Map<string, Candle[]>,
  currentTime: number,
): ScanEvalContext {
  const indicatorEngine = new InlineIndicatorExecutionEngine();
  const loadCandles = async (timeframe: string): Promise<Candle[]> =>
    (candlesByTf.get(timeframe) ?? []).filter((candle) => candle.T <= currentTime);

  return {
    symbol,
    marketType,
    isTickerOnlyScan: false,
    candlesByTf,
    loadCandles,
    indicatorEngine,
  };
}

function calculateMetrics(signals: Array<{ pnlPct: number }>): BacktestMetrics {
  let equity = 1;
  let peak = 1;
  let maxDrawdownPct = 0;
  let wins = 0;
  let pnlSum = 0;

  for (const signal of signals) {
    if (signal.pnlPct > 0) wins++;
    pnlSum += signal.pnlPct;
    equity *= 1 + signal.pnlPct / 100;
    peak = Math.max(peak, equity);
    maxDrawdownPct = Math.max(maxDrawdownPct, ((peak - equity) / peak) * 100);
  }

  return {
    signalCount: signals.length,
    winRatePct: signals.length === 0 ? 0 : (wins / signals.length) * 100,
    maxDrawdownPct,
    averageReturnPct: signals.length === 0 ? 0 : pnlSum / signals.length,
  };
}
