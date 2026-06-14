import { Worker } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import { getRedis } from "@/src/lib/redis";
import { prisma } from "@/src/lib/prisma";
import { ScreenerStatus, Prisma } from "@prisma/client";
import type { CandleClosedEvent } from "../../market-data/candle-events";
import { dependencyIndexKey } from "../../indicators/dependency-planner";
import { getRollingWindow } from "../../market-data/rolling-window-store";
import { evaluateRuleTree } from "../../rules/evaluator";
import { validateRuleTree } from "../../rules/validator";
import type { EvaluationContext } from "../../indicators/indicator-types";
import { getPriceFromCandles } from "../../indicators/indicator-types";
import { getIndicatorValue } from "../../indicators/indicator-registry";
import type { IndicatorConfigAst, RuleTree } from "../../rules/ast";
import type { RollingCandleWindow } from "../../indicators/indicator-types";
import { alertDeliveryQueue } from "../../market-data/candle-events";
import { logger } from "@/src/lib/logger";

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

      const candles = await getRollingWindow(marketType, symbol, timeframe);
      let evaluated = 0;

      for (const screener of screeners) {
        const tree = validateRuleTree(screener.ruleTree);
        const ctx = buildContext(marketType, symbol, candles, tree);
        const result = evaluateRuleTree(tree, ctx);

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

        if (result.passed && screener.alerts.length > 0) {
          for (const alert of screener.alerts) {
            await alertDeliveryQueue.add("deliver", {
              alertId: alert.id,
              screenerMatchId: match.id,
              screenerName: screener.name,
              symbol,
              timeframe,
              candle,
              snapshots: result.snapshots,
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

function buildContext(
  marketType: string,
  symbol: string,
  allCandles: RollingCandleWindow,
  _tree: RuleTree,
): EvaluationContext {
  const candlesByTf = new Map<string, typeof allCandles>();
  candlesByTf.set("default", allCandles);

  return {
    symbol,
    marketType,
    getPrice: (tf, source) => {
      const candles = candlesByTf.get(tf) ?? allCandles;
      return getPriceFromCandles(candles, source);
    },
    getVolume: (tf) => {
      const candles = candlesByTf.get(tf) ?? allCandles;
      if (candles.length === 0) return { current: NaN };
      const last = candles[candles.length - 1];
      const prev = candles.length > 1 ? candles[candles.length - 2] : undefined;
      return { current: last.v, previous: prev?.v };
    },
    getMarketField: (tf, field) => {
      const candles = candlesByTf.get(tf) ?? allCandles;
      if (candles.length === 0) return { current: NaN };
      const last = candles[candles.length - 1];
      const value = (last as unknown as Record<string, number>)[field] ?? NaN;
      return { current: value };
    },
    getIndicator: (config: IndicatorConfigAst) => {
      const candles = candlesByTf.get(config.timeframe) ?? allCandles;
      return getIndicatorValue(candles, config);
    },
  };
}
