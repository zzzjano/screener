import ccxt, { type bybit, type Market, type OHLCV, type Ticker } from "ccxt";
import { withRateLimitBackoff } from "./rate-limit";
import { logger } from "@/src/lib/logger";

let exchangeInstance: bybit | null = null;
let marketsLoadedAt = 0;
const MARKETS_TTL_MS = 5 * 60 * 1000;

export function getCcxtBybit(): bybit {
  if (!exchangeInstance) {
    exchangeInstance = new ccxt.bybit({
      enableRateLimit: true,
      options: { defaultType: "linear" },
    });
  }
  return exchangeInstance;
}

export async function ensureMarketsLoaded(exchange: bybit = getCcxtBybit()): Promise<void> {
  const hasMarkets = Object.keys(exchange.markets).length > 0;
  const fresh = Date.now() - marketsLoadedAt < MARKETS_TTL_MS;
  if (hasMarkets && fresh) return;

  logger.info("CCXT loadMarkets...");
  const startedAt = Date.now();
  await exchange.loadMarkets();
  marketsLoadedAt = Date.now();
  logger.info("CCXT loadMarkets zakończone", {
    markets: Object.keys(exchange.markets).length,
    durationMs: Date.now() - startedAt,
  });
}

export interface CcxtMarketSession {
  exchange: bybit;
  ccxtSymbolByCompact: Map<string, string>;
}

/** Single loadMarkets + compact symbol index for batch scans. */
export async function createCcxtMarketSession(quoteAsset = "USDT"): Promise<CcxtMarketSession> {
  const exchange = getCcxtBybit();
  await ensureMarketsLoaded(exchange);

  const ccxtSymbolByCompact = new Map<string, string>();
  for (const entry of listLinearUsdtMarkets(exchange, quoteAsset)) {
    ccxtSymbolByCompact.set(entry.compact, entry.ccxtSymbol);
  }

  return { exchange, ccxtSymbolByCompact };
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
  const entries: Array<{ compact: string; ccxtSymbol: string; market: Market }> = [];

  for (const market of Object.values(exchange.markets)) {
    if (!market?.linear || !market.active || market.quote !== quoteAsset) continue;
    entries.push({
      compact: toCompactSymbol(market.symbol),
      ccxtSymbol: market.symbol,
      market,
    });
  }

  return entries;
}

export async function listActiveLinearCompactSymbols(quoteAsset = "USDT"): Promise<string[]> {
  const session = await createCcxtMarketSession(quoteAsset);
  return Array.from(session.ccxtSymbolByCompact.keys()).sort();
}

export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: string,
  limit = 200,
  session?: CcxtMarketSession,
): Promise<OHLCV[]> {
  const activeSession = session ?? (await createCcxtMarketSession());
  const compact = normalizeCompactSymbol(symbol);
  const ccxtSymbol =
    activeSession.ccxtSymbolByCompact.get(compact) ??
    resolveCcxtLinearSymbol(activeSession.exchange, symbol);

  if (!ccxtSymbol) {
    throw new Error(`Nie znaleziono rynku CCXT dla symbolu: ${symbol}`);
  }

  return withRateLimitBackoff(() =>
    activeSession.exchange.fetchOHLCV(ccxtSymbol, timeframe, undefined, limit),
  );
}

export async function fetchLinearTickerMap(session?: CcxtMarketSession): Promise<Map<string, { price: number; volume24h: number }>> {
  const activeSession = session ?? (await createCcxtMarketSession());
  logger.info("CCXT fetchTickers...");
  const startedAt = Date.now();
  const tickers = await withRateLimitBackoff(() => activeSession.exchange.fetchTickers());
  logger.info("CCXT fetchTickers zakończone", {
    tickers: Object.keys(tickers).length,
    durationMs: Date.now() - startedAt,
  });

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
