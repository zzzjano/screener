import type { RuleTree } from "../rules/ast";
import { evaluateRuleTree } from "../rules/evaluator";
import { buildEvaluationContext } from "../rules/evaluation-context";
import { compileDependencies, validateRuleTree } from "../rules/validator";
import {
  createCcxtMarketSession,
  fetchHistoricalCandles,
  fetchLinearTickerMap,
  type CcxtMarketSession,
} from "../market-data/ccxt-client";
import { ccxtOhlcvToCandle } from "../market-data/rolling-window-store";
import { computeScanCandleLimit } from "./scan-candle-limit";
import { logger } from "@/src/lib/logger";
import type { Candle } from "../indicators/indicator-types";

export interface InstantScanMatch {
  symbol: string;
  price: number;
  volume24h: number;
  timeframe: string;
  matchedConditions: string[];
}

export interface InstantScanResult {
  scanned: number;
  matched: number;
  durationMs: number;
  results: InstantScanMatch[];
}

export interface InstantScanOptions {
  concurrency?: number;
  quoteAsset?: string;
  marketType?: string;
}

const DEFAULT_CONCURRENCY = 12;
const PROGRESS_LOG_EVERY = 50;

export async function runInstantScan(
  input: unknown,
  options: InstantScanOptions = {},
): Promise<InstantScanResult> {
  const startedAt = Date.now();
  const tree = validateRuleTree(input);
  const deps = compileDependencies(tree, []);
  const timeframes = deps.timeframes.length > 0 ? deps.timeframes : ["15m"];
  const primaryTimeframe = timeframes[0];
  const candleLimit = computeScanCandleLimit(tree, deps);
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const marketType = options.marketType ?? "LINEAR";

  logger.info("Instant scan start", {
    timeframes,
    candleLimit,
    concurrency,
    indicatorCount: deps.indicators.length,
  });

  const session = await createCcxtMarketSession(options.quoteAsset ?? "USDT");
  const symbols = Array.from(session.ccxtSymbolByCompact.keys()).sort();
  const tickerMap = await fetchLinearTickerMap(session);

  logger.info("Instant scan - skanowanie symboli", { total: symbols.length });

  const results: InstantScanMatch[] = [];
  let processed = 0;
  let skipped = 0;

  for (let index = 0; index < symbols.length; index += concurrency) {
    const chunk = symbols.slice(index, index + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((symbol) =>
        scanSymbol({
          symbol,
          tree,
          timeframes,
          primaryTimeframe,
          marketType,
          candleLimit,
          tickerMap,
          session,
        }),
      ),
    );

    for (const match of chunkResults) {
      processed += 1;
      if (match) {
        results.push(match);
      } else {
        skipped += 1;
      }
    }

    const done = Math.min(index + concurrency, symbols.length);
    if (done % PROGRESS_LOG_EVERY === 0 || done === symbols.length) {
      logger.info("Instant scan postęp", {
        done,
        total: symbols.length,
        matched: results.length,
        skipped,
        elapsedMs: Date.now() - startedAt,
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  logger.info("Instant scan zakończony", {
    scanned: symbols.length,
    matched: results.length,
    skipped,
    durationMs,
  });

  return {
    scanned: symbols.length,
    matched: results.length,
    durationMs,
    results: results.sort((a, b) => b.volume24h - a.volume24h),
  };
}

async function scanSymbol({
  symbol,
  tree,
  timeframes,
  primaryTimeframe,
  marketType,
  candleLimit,
  tickerMap,
  session,
}: {
  symbol: string;
  tree: RuleTree;
  timeframes: string[];
  primaryTimeframe: string;
  marketType: string;
  candleLimit: number;
  tickerMap: Map<string, { price: number; volume24h: number }>;
  session: CcxtMarketSession;
}): Promise<InstantScanMatch | null> {
  try {
    const candlesByTf = new Map<string, Candle[]>();

    for (const timeframe of timeframes) {
      const rows = await fetchHistoricalCandles(symbol, timeframe, candleLimit, session);
      const candles = rows.map(ccxtOhlcvToCandle);
      if (candles.length === 0) return null;
      candlesByTf.set(timeframe, candles);
    }

    const ctx = buildEvaluationContext(symbol, marketType, candlesByTf);
    const evaluation = evaluateRuleTree(tree, ctx);
    if (!evaluation.passed) return null;

    const ticker = tickerMap.get(symbol);
    const primaryCandles = candlesByTf.get(primaryTimeframe) ?? candlesByTf.values().next().value;
    const lastCandle = primaryCandles?.[primaryCandles.length - 1];

    return {
      symbol,
      price: ticker?.price ?? lastCandle?.c ?? 0,
      volume24h: ticker?.volume24h ?? lastCandle?.v ?? 0,
      timeframe: primaryTimeframe,
      matchedConditions: evaluation.snapshots
        .filter((snapshot) => snapshot.passed)
        .map((snapshot) => snapshot.explanationPl),
    };
  } catch (error) {
    logger.warn("Instant scan - pominięto symbol", {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += concurrency) {
    const chunk = items.slice(index, index + concurrency);
    results.push(...(await Promise.all(chunk.map(worker))));
  }
  return results;
}
