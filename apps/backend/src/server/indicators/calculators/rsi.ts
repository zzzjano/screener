import { RSI, SMA, EMA, MACD, BollingerBands, ATR } from "technicalindicators";
import type { RollingCandleWindow } from "../indicator-types";
import { candlesToCloses, candlesToOHLC, candlesToVolumes } from "../indicator-types";

export function calcRsi(candles: RollingCandleWindow, period = 14): number[] {
  return RSI.calculate({ values: candlesToCloses(candles), period });
}

export function calcSma(candles: RollingCandleWindow, period: number): number[] {
  return SMA.calculate({ values: candlesToCloses(candles), period });
}

export function calcEma(candles: RollingCandleWindow, period: number): number[] {
  return EMA.calculate({ values: candlesToCloses(candles), period });
}

export function calcMacd(
  candles: RollingCandleWindow,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
) {
  return MACD.calculate({
    values: candlesToCloses(candles),
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
}

export function calcBollingerBands(
  candles: RollingCandleWindow,
  period = 20,
  stdDev = 2,
) {
  return BollingerBands.calculate({
    values: candlesToCloses(candles),
    period,
    stdDev,
  });
}

export function calcAtr(candles: RollingCandleWindow, period = 14): number[] {
  const ohlc = candlesToOHLC(candles);
  return ATR.calculate({
    high: ohlc.high,
    low: ohlc.low,
    close: ohlc.close,
    period,
  });
}

export function calcVolumeSma(candles: RollingCandleWindow, period: number): number[] {
  return SMA.calculate({ values: candlesToVolumes(candles), period });
}

export function calcVolumeSpikeRatio(
  candles: RollingCandleWindow,
  period = 20,
): { current: number; previous?: number } {
  const volumes = candlesToVolumes(candles);
  if (volumes.length < period + 1) return { current: 0 };
  const baseline = volumes.slice(-period - 1, -1);
  const avg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const current = volumes[volumes.length - 1];
  const prevVol = volumes[volumes.length - 2];
  const prevBaseline = volumes.slice(-period - 2, -2);
  const prevAvg =
    prevBaseline.length > 0
      ? prevBaseline.reduce((a, b) => a + b, 0) / prevBaseline.length
      : avg;
  return {
    current: avg > 0 ? current / avg : 0,
    previous: prevAvg > 0 ? prevVol / prevAvg : undefined,
  };
}
