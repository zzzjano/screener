import { Worker } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import { getRedis } from "@/src/lib/redis";
import { prisma } from "@/src/lib/prisma";
import { AlertDeliveryStatus, MarketType, ScreenerStatus, TriggerPolicy, Prisma } from "@prisma/client";
import type { CandleClosedEvent } from "../../market-data/candle-events";
import { dependencyIndexKey } from "../../indicators/dependency-planner";
import {
  ccxtOhlcvToCandle,
  getFreshRollingWindow,
} from "../../market-data/rolling-window-store";
import { validateRuleTree } from "../../rules/validator";
import {
  createCcxtMarketSession,
  fetchHistoricalCandlesLimited,
  fetchLinearTickerMap,
  type CcxtMarketSession,
  type LinearTickerSnapshot,
} from "../../market-data/ccxt-client";
import { InlineIndicatorExecutionEngine } from "../../indicators/indicator-execution-engine";
import { alertDeliveryQueue } from "../../market-data/candle-events";
import { buildScanDependencyGraph } from "../../screeners/scan-dependencies";
import { buildScanPlan, ruleTreeUsesTickerOperands } from "../../screeners/scan-planner";
import { evaluateRuleTreeForScan, type ScanEvalContext } from "../../screeners/scan-evaluator";
import { formatMatchedConditions } from "../../screeners/match-format";
import { getLiquidationMetric } from "../../derivatives/liquidation-aggregator";
import { getOpenInterestChange, getTickerSnapshot } from "../../derivatives/redis-store";
import { timeframeToMs } from "../../market-data/timeframe";
import { getActiveBybitCredentialMetadata } from "../../exchanges/credential-service";
import { portfolioSyncQueue } from "../../market-data/candle-events";
import { resolvePortfolioMetric, resolvePositionMetric } from "../../portfolio/portfolio-metrics";
import { readPositionForSymbol } from "../../portfolio/portfolio-cache";
import { logger } from "@/src/lib/logger";
import type { Candle } from "../../indicators/indicator-types";

export function createScreenerEvaluateWorker(): Worker {
  return new Worker<CandleClosedEvent>(
    "screener-evaluate",
    async (job) => {
      const { marketType, symbol, timeframe, candle } = job.data;
      const redis = getRedis();
      const depKey = dependencyIndexKey(marketType, symbol, timeframe);
      const screenerIds = await redis.smembers(depKey);
      if (screenerIds.length === 0) return { evaluated: 0 };

      const screeners = await prisma.screener.findMany({
        where: { id: { in: screenerIds }, status: ScreenerStatus.ACTIVE },
        include: { alerts: { where: { isEnabled: true } } },
      });

      let evaluated = 0;
      let sessionPromise: Promise<CcxtMarketSession> | null = null;
      let tickerMapPromise: Promise<Map<string, LinearTickerSnapshot>> | null = null;

      const getSession = () => {
        sessionPromise ??= createCcxtMarketSession();
        return sessionPromise;
      };

      const getTickerMap = async () => {
        tickerMapPromise ??= getSession().then((session) => fetchLinearTickerMap(session));
        return tickerMapPromise;
      };

      for (const screener of screeners) {
        const tree = validateRuleTree(screener.ruleTree);
        const plan = buildScanPlan(tree);
        const depGraph = buildScanDependencyGraph(tree);
        const indicatorEngine = new InlineIndicatorExecutionEngine();
        const needsTicker = plan.isTickerOnly || ruleTreeUsesTickerOperands(tree);
        const ticker = needsTicker ? (await getTickerMap()).get(symbol) : undefined;
        const activeCredential = await getActiveBybitCredentialMetadata(screener.userId);
        const ctx = createWorkerScanContext({
          symbol,
          marketType,
          ticker,
          isTickerOnlyScan: plan.isTickerOnly,
          depGraph,
          getSession,
          indicatorEngine,
          userId: screener.userId,
          credentialId: activeCredential?.id,
        });
        const result = await evaluateRuleTreeForScan(tree, ctx);
        await indicatorEngine.dispose();
        const previousMatch = await findPreviousMatch(
          screener.id,
          symbol,
          timeframe,
          new Date(candle.T),
        );

        const match = await prisma.screenerMatch.upsert({
          where: {
            screenerId_symbol_timeframe_candleCloseTime: {
              screenerId: screener.id,
              symbol,
              timeframe,
              candleCloseTime: new Date(candle.T),
            },
          },
          update: {
            matched: result.passed,
            snapshot: result.snapshots as unknown as Prisma.InputJsonValue,
          },
          create: {
            screenerId: screener.id,
            symbol,
            timeframe,
            candleCloseTime: new Date(candle.T),
            matched: result.passed,
            snapshot: result.snapshots as unknown as Prisma.InputJsonValue,
          },
        });

        await prisma.screener.update({
          where: { id: screener.id },
          data: { lastEvaluatedAt: new Date() },
        });

        if (
          result.passed &&
          screener.alerts.length > 0 &&
          shouldNotifyForTriggerPolicy(screener.triggerPolicy, previousMatch?.matched)
        ) {
          const alertTicker = ticker ?? (await getTickerMap()).get(symbol);
          const position = activeCredential ? await readPositionForSymbol(screener.userId, symbol) : null;
          if (activeCredential) {
            await portfolioSyncQueue.add(
              "sync-one",
              { userId: screener.userId, credentialId: activeCredential.id },
              { jobId: `portfolio-sync-${activeCredential.id}-${Date.now()}` },
            );
          }
          const matchedConditions = formatMatchedConditions(tree, result.snapshots);

          for (const alert of screener.alerts) {
            if (
              await isAlertSymbolCooldownActive(
                alert.id,
                screener.id,
                symbol,
                alert.cooldownSeconds,
              )
            ) {
              logger.info("Alert pominięty przez cooldown DB", {
                alertId: alert.id,
                screenerId: screener.id,
                symbol,
              });
              continue;
            }

            await alertDeliveryQueue.add("deliver", {
              alertId: alert.id,
              screenerMatchId: match.id,
              screenerName: screener.name,
              symbol,
              timeframe,
              candle,
              snapshots: result.snapshots,
              matchedConditions,
              price: alertTicker?.price ?? candle.c,
              change24hPct: alertTicker?.change24hPct ?? null,
              fundingRate: alertTicker?.fundingRate ?? null,
              positionContext: position
                ? {
                    side: position.side,
                    entryPrice: position.entryPrice,
                    markPrice: position.markPrice,
                    unrealizedPnl: position.unrealizedPnl,
                    pnlPct: position.pnlPct,
                    liquidationPrice: position.liquidationPrice,
                  }
                : null,
            });
          }
        }

        evaluated++;
      }

      logger.info("Ewaluacja screenerów zakończona", { symbol, timeframe, evaluated });
      return { evaluated };
    },
    { connection: getBullMqConnection(), concurrency: 5 },
  );
}

function createWorkerScanContext({
  symbol,
  marketType,
  ticker,
  isTickerOnlyScan,
  depGraph,
  getSession,
  indicatorEngine,
  userId,
  credentialId,
}: {
  symbol: string;
  marketType: string;
  ticker?: LinearTickerSnapshot;
  isTickerOnlyScan: boolean;
  depGraph: ReturnType<typeof buildScanDependencyGraph>;
  getSession: () => Promise<CcxtMarketSession>;
  indicatorEngine: ScanEvalContext["indicatorEngine"];
  userId?: string;
  credentialId?: string;
}): ScanEvalContext {
  const candlesByTf = new Map<string, Candle[]>();
  let sectorTagsPromise: Promise<string[]> | null = null;

  const loadCandles = async (tf: string) => {
    const existing = candlesByTf.get(tf);
    if (existing) return existing;

    const requiredBars = depGraph.candleWindowsByTimeframe[tf] ?? depGraph.maxWarmupBars;
    const cached = await getFreshRollingWindow(marketType, symbol, tf, requiredBars);
    if (cached) {
      candlesByTf.set(tf, cached);
      return cached;
    }

    const session = await getSession();
    const rows = await fetchHistoricalCandlesLimited(symbol, tf, requiredBars, session);
    const candles = rows.map(ccxtOhlcvToCandle);
    candlesByTf.set(tf, candles);
    return candles;
  };

  return {
    symbol,
    marketType,
    ticker,
    isTickerOnlyScan,
    candlesByTf,
    loadCandles,
    getDerivativeMetric: async (operand) => {
      if (operand.kind === "FUNDING_RATE") {
        const snapshot = await getTickerSnapshot(marketType, symbol);
        return { current: snapshot?.fundingRate ?? NaN };
      }
      if (operand.kind === "OPEN_INTEREST") {
        const snapshot = await getTickerSnapshot(marketType, symbol);
        if (operand.transform === "CURRENT") return { current: snapshot?.openInterest ?? NaN };
        const lookbackMs = timeframeToMs(operand.timeframe) * (operand.lookbackBars ?? 1);
        const change = await getOpenInterestChange(marketType, symbol, lookbackMs);
        return { current: change?.current ?? NaN, previous: change?.previous };
      }
      const current = await getLiquidationMetric(marketType, symbol, operand.timeframe, operand.side);
      return { current };
    },
    getSectorTags: async () => {
      sectorTagsPromise ??= prisma.market
        .findUnique({
          where: {
            exchange_type_symbol: {
              exchange: "bybit",
              type: marketType as MarketType,
              symbol,
            },
          },
          select: { sectorTags: true },
        })
        .then((market) => market?.sectorTags ?? []);
      return sectorTagsPromise;
    },
    getPortfolioMetric: async (operand) => {
      if (!userId || !credentialId) return { current: NaN };
      return resolvePortfolioMetric({ userId, credentialId, operand });
    },
    getPositionMetric: async (currentSymbol, operand) => {
      if (!userId) return { current: NaN };
      return resolvePositionMetric({ userId, symbol: currentSymbol, operand });
    },
    indicatorEngine,
  };
}

async function findPreviousMatch(
  screenerId: string,
  symbol: string,
  timeframe: string,
  candleCloseTime: Date,
): Promise<{ matched: boolean } | null> {
  return prisma.screenerMatch.findFirst({
    where: {
      screenerId,
      symbol,
      timeframe,
      candleCloseTime: { lt: candleCloseTime },
    },
    orderBy: { candleCloseTime: "desc" },
    select: { matched: true },
  });
}

function shouldNotifyForTriggerPolicy(
  triggerPolicy: TriggerPolicy,
  previousMatched: boolean | undefined,
): boolean {
  if (triggerPolicy === TriggerPolicy.EVERY_CLOSED_CANDLE) return true;
  return previousMatched !== true;
}

async function isAlertSymbolCooldownActive(
  alertId: string,
  screenerId: string,
  symbol: string,
  cooldownSeconds: number,
): Promise<boolean> {
  if (cooldownSeconds <= 0) return false;

  const since = new Date(Date.now() - cooldownSeconds * 1000);
  const recentMatches = await prisma.screenerMatch.findMany({
    where: {
      screenerId,
      symbol,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (recentMatches.length === 0) return false;

  const recentDelivery = await prisma.alertDelivery.findFirst({
    where: {
      alertId,
      status: AlertDeliveryStatus.SENT,
      sentAt: { gte: since },
      screenerMatchId: { in: recentMatches.map((match) => match.id) },
    },
    select: { id: true },
  });

  return recentDelivery !== null;
}
