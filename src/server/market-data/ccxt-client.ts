import ccxt, { type bybit, type OHLCV, type Ticker } from "ccxt";
import { withRateLimitBackoff } from "./rate-limit";

let exchangeInstance: bybit | null = null;

export function getCcxtBybit(): bybit {
  if (!exchangeInstance) {
    exchangeInstance = new ccxt.bybit({
      enableRateLimit: true,
      options: { defaultType: "linear" },
    });
  }
  return exchangeInstance;
}

export function toBybitLinearSymbol(symbol: string): string {
  if (symbol.includes("/")) return symbol;
  const base = symbol.endsWith("USDT") ? symbol.slice(0, -4) : symbol;
  return `${base}/USDT:USDT`;
}

export function normalizeLinearSymbol(marketId: string): string {
  const [pair] = marketId.split(":");
  return pair.replace("/", "");
}

export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: string,
  limit = 200,
): Promise<OHLCV[]> {
  const exchange = getCcxtBybit();
  await exchange.loadMarkets();
  const ccxtSymbol = symbol.includes("/") ? symbol : toBybitLinearSymbol(symbol);
  return withRateLimitBackoff(() => exchange.fetchOHLCV(ccxtSymbol, timeframe, undefined, limit));
}

export async function fetchLinearTickerMap(): Promise<Map<string, { price: number; volume24h: number }>> {
  const exchange = getCcxtBybit();
  await exchange.loadMarkets();
  const tickers = await withRateLimitBackoff(() => exchange.fetchTickers());
  const map = new Map<string, { price: number; volume24h: number }>();

  for (const [marketId, ticker] of Object.entries(tickers) as [string, Ticker][]) {
    if (!marketId.endsWith(":USDT")) continue;
    const symbol = normalizeLinearSymbol(marketId);
    map.set(symbol, {
      price: Number(ticker.last ?? ticker.close ?? 0),
      volume24h: Number(ticker.quoteVolume ?? ticker.baseVolume ?? 0),
    });
  }

  return map;
}
