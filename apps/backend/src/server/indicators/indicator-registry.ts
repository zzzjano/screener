import type { IndicatorConfigAst } from "../rules/ast";
import type { RollingCandleWindow } from "./indicator-types";
import {
  calcRsi,
  calcSma,
  calcEma,
  calcMacd,
  calcBollingerBands,
  calcAtr,
  calcVolumeSpikeRatio,
} from "./calculators/rsi";

export function getIndicatorWarmup(kind: string, params: Record<string, unknown>): number {
  switch (kind) {
    case "RSI":
      return (params.period as number) ?? 14;
    case "SMA":
    case "EMA":
      return (params.period as number) ?? 20;
    case "MACD":
      return ((params.slowPeriod as number) ?? 26) + ((params.signalPeriod as number) ?? 9);
    case "BOLLINGER_BANDS":
      return (params.period as number) ?? 20;
    case "ATR":
      return (params.period as number) ?? 14;
    default:
      return 50;
  }
}

export function getIndicatorValue(
  candles: RollingCandleWindow,
  config: IndicatorConfigAst,
): { current: number; previous?: number } {
  const params = config.params;
  const field = config.outputField ?? "value";

  switch (config.kind) {
    case "RSI": {
      const values = calcRsi(candles, (params.period as number) ?? 14);
      return lastTwo(values);
    }
    case "SMA": {
      const values = calcSma(candles, (params.period as number) ?? 20);
      return lastTwo(values);
    }
    case "EMA": {
      const values = calcEma(candles, (params.period as number) ?? 20);
      return lastTwo(values);
    }
    case "MACD": {
      const values = calcMacd(
        candles,
        (params.fastPeriod as number) ?? 12,
        (params.slowPeriod as number) ?? 26,
        (params.signalPeriod as number) ?? 9,
      );
      const mapped = values.map((v) => {
        if (field === "signal") return v.signal ?? 0;
        if (field === "histogram") return v.histogram ?? 0;
        return v.MACD ?? 0;
      });
      return lastTwo(mapped);
    }
    case "BOLLINGER_BANDS": {
      const values = calcBollingerBands(
        candles,
        (params.period as number) ?? 20,
        (params.stdDev as number) ?? 2,
      );
      const mapped = values.map((v) => {
        if (field === "upper") return v.upper;
        if (field === "lower") return v.lower;
        if (field === "middle") return v.middle;
        return v.middle;
      });
      return lastTwo(mapped);
    }
    case "ATR": {
      const values = calcAtr(candles, (params.period as number) ?? 14);
      return lastTwo(values);
    }
  }

  if (field === "volumeSpike") {
    return calcVolumeSpikeRatio(candles, (params.period as number) ?? 20);
  }

  return { current: NaN };
}

function lastTwo(values: number[]): { current: number; previous?: number } {
  if (values.length === 0) return { current: NaN };
  return {
    current: values[values.length - 1],
    previous: values.length > 1 ? values[values.length - 2] : undefined,
  };
}

export function indicatorCacheKey(
  marketType: string,
  symbol: string,
  timeframe: string,
  config: IndicatorConfigAst,
): string {
  const paramsHash = JSON.stringify(config.params);
  return `indicator:bybit:${marketType}:${symbol}:${timeframe}:${config.kind}:${paramsHash}:${config.source}:${config.outputField ?? "value"}`;
}
