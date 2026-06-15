import type { IndicatorConfigAst } from "../rules/ast";

export interface Candle {
  t: number;
  T: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  turnover?: number;
  closed: boolean;
}

export type RollingCandleWindow = Candle[];

export interface EvaluationContext {
  symbol: string;
  marketType: string;
  getPrice: (
    timeframe: string,
    source: string,
  ) => { current: number; previous?: number };
  getVolume: (timeframe: string) => { current: number; previous?: number };
  getMarketField: (
    timeframe: string,
    field: string,
  ) => { current: number; previous?: number };
  getIndicator: (
    config: IndicatorConfigAst,
  ) => { current: number; previous?: number };
}

export function getPriceFromCandles(
  candles: RollingCandleWindow,
  source: string,
): { current: number; previous?: number } {
  if (candles.length === 0) return { current: NaN };
  const last = candles[candles.length - 1];
  const prev = candles.length > 1 ? candles[candles.length - 2] : undefined;

  const pick = (c: Candle) => {
    switch (source) {
      case "OPEN":
        return c.o;
      case "HIGH":
        return c.h;
      case "LOW":
        return c.l;
      case "HL2":
        return (c.h + c.l) / 2;
      case "HLC3":
        return (c.h + c.l + c.c) / 3;
      case "OHLC4":
        return (c.o + c.h + c.l + c.c) / 4;
      default:
        return c.c;
    }
  };

  return {
    current: pick(last),
    previous: prev ? pick(prev) : undefined,
  };
}

export function candlesToCloses(candles: RollingCandleWindow): number[] {
  return candles.map((c) => c.c);
}

export function candlesToVolumes(candles: RollingCandleWindow): number[] {
  return candles.map((c) => c.v);
}

export function candlesToOHLC(candles: RollingCandleWindow) {
  return {
    open: candles.map((c) => c.o),
    high: candles.map((c) => c.h),
    low: candles.map((c) => c.l),
    close: candles.map((c) => c.c),
    volume: candles.map((c) => c.v),
  };
}
