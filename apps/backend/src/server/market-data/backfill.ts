import { fetchHistoricalCandles } from "./ccxt-client";
import {
  ccxtOhlcvToCandle,
  getRollingWindow,
  setRollingWindow,
} from "./rolling-window-store";
import { logger } from "../../lib/logger";

export async function backfillRollingWindow(
  marketType: string,
  symbol: string,
  timeframe: string,
  requiredBars = 200,
): Promise<number> {
  const existing = await getRollingWindow(marketType, symbol, timeframe);
  if (existing.length >= requiredBars) {
    return existing.length;
  }

  const rows = await fetchHistoricalCandles(symbol, timeframe, requiredBars);
  const candles = rows.map(ccxtOhlcvToCandle);
  await setRollingWindow(marketType, symbol, timeframe, candles, requiredBars + 50);
  logger.info("Backfill zakończony", { symbol, timeframe, count: candles.length });
  return candles.length;
}
