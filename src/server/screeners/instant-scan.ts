import type { RuleTree } from "../rules/ast";
import { evaluateRuleTree } from "../rules/evaluator";
import { buildEvaluationContext } from "../rules/evaluation-context";
import { compileDependencies, validateRuleTree } from "../rules/validator";
import { fetchHistoricalCandles, fetchLinearTickerMap, getCcxtBybit, normalizeLinearSymbol } from "../market-data/ccxt-client";
import { ccxtOhlcvToCandle } from "../market-data/rolling-window-store";
import { getActiveSymbols } from "../market-data/bybit-symbols";
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

const DEFAULT_CONCURRENCY = 8;

export async function runInstantScan(
  input: unknown,
  options: InstantScanOptions = {},
): Promise<InstantScanResult> {
  const startedAt = Date.now();
  const tree = validateRuleTree(input);
  const deps = compileDependencies(tree, []);
  const timeframes = deps.timeframes.length > 0 ? deps.timeframes : ["15m"];
  const primaryTimeframe = timeframes[0];
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const marketType = options.marketType ?? "LINEAR";

  const symbols = await resolveScanSymbols(options.quoteAsset ?? "USDT");
  const tickerMap = await fetchLinearTickerMap();

  const results: InstantScanMatch[] = [];

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
          requiredBars: deps.maxWarmupBars,
          tickerMap,
        }),
      ),
    );

    for (const match of chunkResults) {
      if (match) results.push(match);
    }
  }

  const durationMs = Date.now() - startedAt;
  logger.info("Instant scan zakończony", {
    scanned: symbols.length,
    matched: results.length,
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
  requiredBars,
  tickerMap,
}: {
  symbol: string;
  tree: RuleTree;
  timeframes: string[];
  primaryTimeframe: string;
  marketType: string;
  requiredBars: number;
  tickerMap: Map<string, { price: number; volume24h: number }>;
}): Promise<InstantScanMatch | null> {
  try {
    const candlesByTf = new Map<string, Candle[]>();

    for (const timeframe of timeframes) {
      const rows = await fetchHistoricalCandles(symbol, timeframe, requiredBars);
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

async function resolveScanSymbols(quoteAsset: string): Promise<string[]> {
  const fromDb = await getActiveSymbols(quoteAsset);
  if (fromDb.length > 0) return fromDb;

  const exchange = getCcxtBybit();
  await exchange.loadMarkets();
  return Object.keys(exchange.markets)
    .filter((marketId) => marketId.endsWith(`/${quoteAsset}:${quoteAsset}`))
    .map((marketId) => normalizeLinearSymbol(marketId))
    .sort();
}
