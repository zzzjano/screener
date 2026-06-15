import {
  createCcxtMarketSession,
  resolveCcxtLinearSymbol,
  type CcxtMarketSession,
} from "../market-data/ccxt-client";
import { ccxtOhlcvToCandle } from "../market-data/rolling-window-store";
import type { Candle } from "../indicators/indicator-types";

const BYBIT_MAX_OHLCV_LIMIT = 1000;

export async function fetchHistoricalChunk(input: {
  symbol: string;
  timeframe: string;
  sinceMs: number;
  limit?: number;
  session?: CcxtMarketSession;
}): Promise<Candle[]> {
  const session = input.session ?? (await createCcxtMarketSession());
  const ccxtSymbol =
    session.ccxtSymbolByCompact.get(input.symbol) ??
    resolveCcxtLinearSymbol(session.exchange, input.symbol);
  if (!ccxtSymbol) throw new Error(`Missing Bybit linear market for ${input.symbol}`);

  const rows = await session.exchange.fetchOHLCV(
    ccxtSymbol,
    input.timeframe,
    input.sinceMs,
    Math.min(input.limit ?? BYBIT_MAX_OHLCV_LIMIT, BYBIT_MAX_OHLCV_LIMIT),
  );
  return rows.map(ccxtOhlcvToCandle);
}
