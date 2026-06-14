import https from "https";
import ccxt, { type bybit, type Market, type OHLCV, type Ticker } from "ccxt";
import { createLimit } from "@/src/lib/concurrency/limit";
import { withRateLimitBackoff } from "./rate-limit";
import { logger } from "@/src/lib/logger";

let exchangeInstance: bybit | null = null;
let marketsLoadedAt = 0;
const MARKETS_TTL_MS = 5 * 60 * 1000;
const OHLCV_CONCURRENCY = 12;

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  maxFreeSockets: 10,
  timeout: 30_000,
});

const ohlcvLimit = createLimit(OHLCV_CONCURRENCY);

export function getCcxtBybit(): bybit {
  if (!exchangeInstance) {
    exchangeInstance = new ccxt.bybit({
      enableRateLimit: true,
      options: { defaultType: "linear" },
      agent: httpsAgent,
      httpsAgent,
    });
  }
  return exchangeInstance;
}

export async function ensureMarketsLoaded(exchange: bybit = getCcxtBybit()): Promise<void> {
  const markets = exchange.markets ?? {};
  const hasMarkets = Object.keys(markets).length > 0;
  const fresh = Date.now() - marketsLoadedAt < MARKETS_TTL_MS;
  if (hasMarkets && fresh) return;

  logger.info("CCXT loadMarkets...");
  const startedAt = Date.now();
  await exchange.loadMarkets();
  marketsLoadedAt = Date.now();
  logger.info("CCXT loadMarkets zakończone", {
    markets: Object.keys(exchange.markets ?? {}).length,
    durationMs: Date.now() - startedAt,
  });
}

export interface CcxtMarketSession {
  exchange: bybit;
  ccxtSymbolByCompact: Map<string, string>;
  ccxtSymbolByMarketId: Map<string, string>;
}

/** Single loadMarkets + compact symbol index for batch scans. */
export async function createCcxtMarketSession(quoteAsset = "USDT"): Promise<CcxtMarketSession> {
  const exchange = getCcxtBybit();
  await ensureMarketsLoaded(exchange);

  const ccxtSymbolByCompact = new Map<string, string>();
  const ccxtSymbolByMarketId = new Map<string, string>();
  for (const entry of listLinearUsdtMarkets(exchange, quoteAsset)) {
    ccxtSymbolByCompact.set(entry.compact, entry.ccxtSymbol);
    const marketId = entry.market?.id;
    if (marketId) {
      ccxtSymbolByMarketId.set(marketId.toUpperCase(), entry.ccxtSymbol);
    }
  }

  return { exchange, ccxtSymbolByCompact, ccxtSymbolByMarketId };
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
  const markets = exchange.markets ?? {};

  if (input.includes("/")) {
    const withSuffix = input.includes(":") ? input : `${input}:USDT`;
    if (isUsdtLinearSwapMarket(markets[withSuffix])) return withSuffix;
    if (isUsdtLinearSwapMarket(markets[input])) return input;
  }

  for (const [ccxtSymbol, market] of Object.entries(markets)) {
    if (!isUsdtLinearSwapMarket(market)) continue;
    if (toCompactSymbol(ccxtSymbol) === compact) {
      return ccxtSymbol;
    }
  }

  if (compact.endsWith("USDT")) {
    const base = compact.slice(0, -4);
    const candidate = `${base}/USDT:USDT`;
    if (isUsdtLinearSwapMarket(markets[candidate])) return candidate;
  }

  return null;
}

export function isUsdtLinearSwapMarket(
  market: Market | undefined,
  quoteAsset = "USDT",
): market is Market {
  return Boolean(
    market?.active &&
      market.linear === true &&
      market.swap === true &&
      market.settle === quoteAsset &&
      market.quote === quoteAsset,
  );
}

export function listLinearUsdtMarkets(
  exchange: bybit,
  quoteAsset = "USDT",
): Array<{ compact: string; ccxtSymbol: string; market: Market }> {
  const entries: Array<{ compact: string; ccxtSymbol: string; market: Market }> = [];

  const markets = Object.values(exchange.markets ?? {}) as Array<Market | undefined>;

  for (const market of markets) {
    if (!isUsdtLinearSwapMarket(market, quoteAsset)) continue;
    const symbol = market?.symbol;
    if (!symbol) continue;
    entries.push({
      compact: toCompactSymbol(symbol),
      ccxtSymbol: symbol,
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

export function fetchHistoricalCandlesLimited(
  symbol: string,
  timeframe: string,
  limit = 200,
  session?: CcxtMarketSession,
): Promise<OHLCV[]> {
  return ohlcvLimit(() => fetchHistoricalCandles(symbol, timeframe, limit, session));
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

  for (const [tickerKey, ticker] of Object.entries(tickers) as [string, Ticker][]) {
    const ccxtSymbol =
      activeSession.ccxtSymbolByMarketId.get(tickerKey.toUpperCase()) ??
      resolveTickerUnifiedSymbol(activeSession.exchange, tickerKey);

    if (!ccxtSymbol) continue;
    const compact = toCompactSymbol(ccxtSymbol);
    map.set(compact, {
      price: Number(ticker.last ?? ticker.close ?? 0),
      volume24h: Number(ticker.quoteVolume ?? ticker.baseVolume ?? 0),
    });
  }

  return map;
}

function resolveTickerUnifiedSymbol(exchange: bybit, tickerKey: string): string | null {
  if (!tickerKey.includes("/")) return null;
  const market = exchange.markets?.[tickerKey];
  return isUsdtLinearSwapMarket(market) ? (market?.symbol ?? null) : null;
}
