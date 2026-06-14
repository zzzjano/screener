import type { ScreenerDependency } from "../rules/ast";

export function buildDependencyPlan(deps: ScreenerDependency[]) {
  const streams = new Map<string, { symbols: Set<string>; maxWarmup: number }>();

  for (const dep of deps) {
    for (const tf of dep.timeframes) {
      const key = tf;
      const entry = streams.get(key) ?? { symbols: new Set<string>(), maxWarmup: 0 };
      for (const sym of dep.symbols) entry.symbols.add(sym);
      entry.maxWarmup = Math.max(entry.maxWarmup, dep.maxWarmupBars);
      streams.set(key, entry);
    }
  }

  return streams;
}

export function dependencyIndexKey(marketType: string, symbol: string, timeframe: string): string {
  return `deps:${marketType}:${symbol}:${timeframe}`;
}

export function ohlcvKey(
  exchange: string,
  marketType: string,
  symbol: string,
  timeframe: string,
): string {
  return `ohlcv:${exchange}:${marketType}:${symbol}:${timeframe}`;
}

export function evalDedupKey(symbol: string, timeframe: string, closeTime: number): string {
  return `eval:${symbol}:${timeframe}:${closeTime}`;
}
