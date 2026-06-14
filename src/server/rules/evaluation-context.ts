import type { IndicatorConfigAst } from "../rules/ast";
import type { Candle, EvaluationContext } from "../indicators/indicator-types";
import { getPriceFromCandles } from "../indicators/indicator-types";
import { getIndicatorValue } from "../indicators/indicator-registry";

export function buildEvaluationContext(
  symbol: string,
  marketType: string,
  candlesByTf: Map<string, Candle[]>,
): EvaluationContext {
  const resolveCandles = (timeframe: string): Candle[] =>
    candlesByTf.get(timeframe) ?? candlesByTf.values().next().value ?? [];

  return {
    symbol,
    marketType,
    getPrice: (tf, source) => {
      const candles = resolveCandles(tf);
      return getPriceFromCandles(candles, source);
    },
    getVolume: (tf) => {
      const candles = resolveCandles(tf);
      if (candles.length === 0) return { current: NaN };
      const last = candles[candles.length - 1];
      const prev = candles.length > 1 ? candles[candles.length - 2] : undefined;
      return { current: last.v, previous: prev?.v };
    },
    getMarketField: (tf, field) => {
      const candles = resolveCandles(tf);
      if (candles.length === 0) return { current: NaN };
      const last = candles[candles.length - 1];
      const value = (last as unknown as Record<string, number>)[field] ?? NaN;
      return { current: value };
    },
    getIndicator: (config: IndicatorConfigAst) => {
      const candles = resolveCandles(config.timeframe);
      return getIndicatorValue(candles, config);
    },
  };
}
