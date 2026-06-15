import type { Candle } from "../indicators/indicator-types";
import type { BacktestExitConfig } from "./types";

export interface ExitResult {
  exitIndex: number;
  exitTime: number;
  exitPrice: number;
  pnlPct: number;
  maxAdverseExcursionPct: number;
  maxFavorableExcursionPct: number;
}

export function resolveExit(
  candles: Candle[],
  entryIndex: number,
  config: BacktestExitConfig,
): ExitResult | null {
  const entry = candles[entryIndex];
  if (!entry) return null;

  const feePct = ((config.feeBps ?? 0) + (config.slippageBps ?? 0)) / 100;
  const takeProfit = config.takeProfitPct ?? Number.POSITIVE_INFINITY;
  const stopLoss = config.stopLossPct ?? Number.POSITIVE_INFINITY;
  const maxBars = config.maxBars ?? 24;
  let maxFav = 0;
  let maxAdv = 0;

  for (let i = entryIndex + 1; i < candles.length && i <= entryIndex + maxBars; i++) {
    const candle = candles[i];
    const highPnl = ((candle.h - entry.c) / entry.c) * 100;
    const lowPnl = ((candle.l - entry.c) / entry.c) * 100;
    maxFav = Math.max(maxFav, highPnl);
    maxAdv = Math.min(maxAdv, lowPnl);

    const stopHit = lowPnl <= -stopLoss;
    const targetHit = highPnl >= takeProfit;
    const canUseTpSl = config.kind === "TAKE_PROFIT_STOP_LOSS" || config.kind === "EITHER";
    if (canUseTpSl && (stopHit || targetHit)) {
      const exitPrice = stopHit ? entry.c * (1 - stopLoss / 100) : entry.c * (1 + takeProfit / 100);
      return buildExit(i, candle.T, entry.c, exitPrice, feePct, maxAdv, maxFav);
    }

    const barsElapsed = i === entryIndex + maxBars;
    if ((config.kind === "BARS_ELAPSED" || config.kind === "EITHER") && barsElapsed) {
      return buildExit(i, candle.T, entry.c, candle.c, feePct, maxAdv, maxFav);
    }
  }

  return null;
}

function buildExit(
  exitIndex: number,
  exitTime: number,
  entryPrice: number,
  exitPrice: number,
  costPct: number,
  maxAdverse: number,
  maxFavorable: number,
): ExitResult {
  return {
    exitIndex,
    exitTime,
    exitPrice,
    pnlPct: ((exitPrice - entryPrice) / entryPrice) * 100 - costPct,
    maxAdverseExcursionPct: maxAdverse,
    maxFavorableExcursionPct: maxFavorable,
  };
}
