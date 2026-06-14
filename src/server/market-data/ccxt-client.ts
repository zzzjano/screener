import ccxt, { type bybit, type Market, type OHLCV, type Ticker } from "ccxt";
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

/** BTC/USDT:USDT -> BTCUSDT */
export function toCompactSymbol(ccxtSymbol: string): string {
  const pairPart = ccxtSymbol.split(":")[0];
  return pairPart.replace("/", "").toUpperCase();
}

/** Normalizes raw DB/UI symbols (BTCUSDT, BTCUSDT:USDT, BTC/USDT:USDT) to BTCUSDT. */
export function normalizeCompactSymbol(input: string): string {
  const trimmed = input.trim().toUpperCase();
  if (trimmed.includes("/")) {
    return toCompactSymbol(trimmed);
  }
  return trimmed.split(":")[0];
}

export function resolveCcxtLinearSymbol(exchange: bybit, input: string): string | null {
  const compact = normalizeCompactSymbol(input);

  if (input.includes("/")) {
    const withSuffix = input.includes(":") ? input : `${input}:USDT`;
    if (exchange.markets[withSuffix]?.active) return withSuffix;
    if (exchange.markets[input]?.active) return input;
  }

  for (const [ccxtSymbol, market] of Object.entries(exchange.markets)) {
    if (!market?.linear || !market.active) continue;
    if (toCompactSymbol(ccxtSymbol) === compact) {
      return ccxtSymbol;
    }
  }

  if (compact.endsWith("USDT")) {
    const base = compact.slice(0, -4);
    const candidate = `${base}/USDT:USDT`;
    if (exchange.markets[candidate]) return candidate;
  }

  return null;
}

export function listLinearUsdtMarkets(
  exchange: bybit,
  quoteAsset = "USDT",
): Array<{ compact: string; ccxtSymbol: string; market: Market }> {
  return Object.values(exchange.markets)
    .filter((market): market is Market => Boolean(market?.linear && market.active && market.quote === quoteAsset))
    .map((market) => ({
      compact: toCompactSymbol(market.symbol),
      ccxtSymbol: market.symbol,
      market,
    }));
}

export async function listActiveLinearCompactSymbols(quoteAsset = "USDT"): Promise<string[]> {
  const exchange = getCcxtBybit();
  await exchange.loadMarkets();
  return listLinearUsdtMarkets(exchange, quoteAsset)
    .map((entry) => entry.compact)
    .sort();
}

export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: string,
  limit = 200,
): Promise<OHLCV[]> {
  const exchange = getCcxtBybit();
  await exchange.loadMarkets();
  const ccxtSymbol = resolveCcxtLinearSymbol(exchange, symbol);
  if (!ccxtSymbol) {
    throw new Error(`Nie znaleziono rynku CCXT dla symbolu: ${symbol}`);
  }
  return withRateLimitBackoff(() => exchange.fetchOHLCV(ccxtSymbol, timeframe, undefined, limit));
}

export async function fetchLinearTickerMap(): Promise<Map<string, { price: number; volume24h: number }>> {
  const exchange = getCcxtBybit();
  await exchange.loadMarkets();
  const tickers = await withRateLimitBackoff(() => exchange.fetchTickers());
  const map = new Map<string, { price: number; volume24h: number }>();

  for (const [ccxtSymbol, ticker] of Object.entries(tickers) as [string, Ticker][]) {
    if (!ccxtSymbol.endsWith(":USDT")) continue;
    const compact = toCompactSymbol(ccxtSymbol);
    map.set(compact, {
      price: Number(ticker.last ?? ticker.close ?? 0),
      volume24h: Number(ticker.quoteVolume ?? ticker.baseVolume ?? 0),
    });
  }

  return map;
}
