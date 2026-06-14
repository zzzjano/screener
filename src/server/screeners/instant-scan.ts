import type { RuleTree } from "../rules/ast";
import { validateRuleTree } from "../rules/validator";
import {
  createCcxtMarketSession,
  fetchHistoricalCandlesLimited,
  fetchLinearTickerMap,
  type CcxtMarketSession,
} from "../market-data/ccxt-client";
import {
  ccxtOhlcvToCandle,
  getFreshRollingWindow,
} from "../market-data/rolling-window-store";
import { createIndicatorExecutionEngine } from "../indicators/indicator-execution-engine";
import { buildScanDependencyGraph } from "./scan-dependencies";
import { buildScanPlan } from "./scan-planner";
import {
  evaluateRuleTreeForScan,
  type ScanEvalContext,
  type TickerSnapshot,
} from "./scan-evaluator";
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
  const plan = buildScanPlan(tree);
  const depGraph = buildScanDependencyGraph(tree);
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const marketType = options.marketType ?? "LINEAR";

  logger.info("Instant scan start", {
    isTickerOnly: plan.isTickerOnly,
    timeframes: depGraph.timeframes,
    candleLimit: plan.candleLimit,
    concurrency,
    indicatorCount: plan.indicatorCount,
  });

  const session = await createCcxtMarketSession(options.quoteAsset ?? "USDT");
  const symbols = Array.from(session.ccxtSymbolByCompact.keys()).sort();
  const tickerMap = await fetchLinearTickerMap(session);

  const symbolWorkload = symbols.length * plan.indicatorCount * plan.candleLimit;
  const indicatorEngine = createIndicatorExecutionEngine({
    symbolWorkload,
    indicatorCount: plan.indicatorCount,
  });

  try {
    logger.info("Instant scan - skanowanie symboli", {
      total: symbols.length,
      mode: plan.isTickerOnly ? "ticker-only" : "full",
    });

    const results: InstantScanMatch[] = [];
    let skipped = 0;

    for (let index = 0; index < symbols.length; index += concurrency) {
      const chunk = symbols.slice(index, index + concurrency);
      const chunkResults = await Promise.all(
        chunk.map((symbol) =>
          scanSymbol({
            symbol,
            tree,
            plan,
            depGraph,
            marketType,
            tickerMap,
            session,
            indicatorEngine,
          }),
        ),
      );

      for (const match of chunkResults) {
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
      isTickerOnly: plan.isTickerOnly,
    });

    return {
      scanned: symbols.length,
      matched: results.length,
      durationMs,
      results: results.sort((a, b) => b.volume24h - a.volume24h),
    };
  } finally {
    await indicatorEngine.dispose();
  }
}

async function loadCandlesRedisFirst(
  symbol: string,
  timeframe: string,
  requiredBars: number,
  marketType: string,
  session: CcxtMarketSession,
): Promise<Candle[]> {
  const cached = await getFreshRollingWindow(marketType, symbol, timeframe, requiredBars);
  if (cached) return cached;

  const rows = await fetchHistoricalCandlesLimited(symbol, timeframe, requiredBars, session);
  return rows.map(ccxtOhlcvToCandle);
}

function createScanContext(
  symbol: string,
  marketType: string,
  ticker: TickerSnapshot | undefined,
  isTickerOnlyScan: boolean,
  depGraph: ReturnType<typeof buildScanDependencyGraph>,
  session: CcxtMarketSession,
  indicatorEngine: ScanEvalContext["indicatorEngine"],
): ScanEvalContext {
  const candlesByTf = new Map<string, Candle[]>();

  const loadCandles = async (timeframe: string): Promise<Candle[]> => {
    const existing = candlesByTf.get(timeframe);
    if (existing) return existing;

    const requiredBars = depGraph.candleWindowsByTimeframe[timeframe] ?? depGraph.maxWarmupBars;
    const candles = await loadCandlesRedisFirst(symbol, timeframe, requiredBars, marketType, session);
    candlesByTf.set(timeframe, candles);
    return candles;
  };

  return {
    symbol,
    marketType,
    ticker,
    isTickerOnlyScan,
    candlesByTf,
    loadCandles,
    indicatorEngine,
  };
}

async function scanSymbol({
  symbol,
  tree,
  plan,
  depGraph,
  marketType,
  tickerMap,
  session,
  indicatorEngine,
}: {
  symbol: string;
  tree: RuleTree;
  plan: ReturnType<typeof buildScanPlan>;
  depGraph: ReturnType<typeof buildScanDependencyGraph>;
  marketType: string;
  tickerMap: Map<string, { price: number; volume24h: number }>;
  session: CcxtMarketSession;
  indicatorEngine: ScanEvalContext["indicatorEngine"];
}): Promise<InstantScanMatch | null> {
  try {
    const ticker = tickerMap.get(symbol);
    if (!ticker) return null;

    const ctx = createScanContext(
      symbol,
      marketType,
      ticker,
      plan.isTickerOnly,
      depGraph,
      session,
      indicatorEngine,
    );
    const evaluation = await evaluateRuleTreeForScan(tree, ctx);
    if (!evaluation.passed) return null;

    const primaryTimeframe = plan.primaryTimeframe;
    const primaryCandles = ctx.candlesByTf.get(primaryTimeframe);
    const lastCandle = primaryCandles?.[primaryCandles.length - 1];

    return {
      symbol,
      price: ticker.price ?? lastCandle?.c ?? 0,
      volume24h: ticker.volume24h ?? lastCandle?.v ?? 0,
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
