import { getRedis } from "../../lib/redis";
import { timeframeToMs } from "../market-data/timeframe";
import type { DerivativeTickerSnapshot, LiquidationAggregate, OpenInterestChange } from "./types";
import { buildOpenInterestChange } from "./normalizers";

const TICKER_TTL_SECONDS = 120;
const SERIES_TTL_SECONDS = 7 * 24 * 60 * 60;

export function tickerKey(marketType: string, symbol: string): string {
  return `ticker:bybit:${marketType}:${symbol}`;
}

export function openInterestKey(marketType: string, symbol: string): string {
  return `deriv:oi:bybit:${marketType}:${symbol}`;
}

export function liquidationKey(marketType: string, symbol: string, timeframe: string): string {
  return `deriv:liq:bybit:${marketType}:${symbol}:${timeframe}`;
}

export async function saveTickerSnapshot(
  marketType: string,
  snapshot: DerivativeTickerSnapshot,
): Promise<void> {
  const redis = getRedis();
  const key = tickerKey(marketType, snapshot.symbol);
  await redis
    .multi()
    .hset(key, serializeHash(snapshot))
    .expire(key, TICKER_TTL_SECONDS)
    .exec();

  if (snapshot.openInterest !== null) {
    const oiKey = openInterestKey(marketType, snapshot.symbol);
    await redis
      .multi()
      .zadd(oiKey, snapshot.timestamp, JSON.stringify({
        timestamp: snapshot.timestamp,
        openInterest: snapshot.openInterest,
        openInterestValue: snapshot.openInterestValue,
      }))
      .expire(oiKey, SERIES_TTL_SECONDS)
      .exec();
  }
}

export async function getTickerSnapshot(
  marketType: string,
  symbol: string,
): Promise<DerivativeTickerSnapshot | null> {
  const raw = await getRedis().hgetall(tickerKey(marketType, symbol));
  if (!raw.symbol) return null;
  return {
    symbol: raw.symbol,
    price: Number(raw.price),
    change24hPct: nullableNumber(raw.change24hPct),
    fundingRate: nullableNumber(raw.fundingRate),
    openInterest: nullableNumber(raw.openInterest),
    openInterestValue: nullableNumber(raw.openInterestValue),
    turnover24h: nullableNumber(raw.turnover24h),
    volume24h: nullableNumber(raw.volume24h),
    timestamp: Number(raw.timestamp),
  };
}

export async function getOpenInterestChange(
  marketType: string,
  symbol: string,
  lookbackMs: number,
): Promise<OpenInterestChange | null> {
  const redis = getRedis();
  const key = openInterestKey(marketType, symbol);
  const latestRaw = await redis.zrevrange(key, 0, 0);
  if (!latestRaw[0]) return null;
  const latest = JSON.parse(latestRaw[0]) as { timestamp: number; openInterest: number };
  const previousRows = await redis.zrevrangebyscore(
    key,
    latest.timestamp - lookbackMs,
    "-inf",
    "LIMIT",
    0,
    1,
  );
  const previous = previousRows[0]
    ? (JSON.parse(previousRows[0]) as { openInterest: number }).openInterest
    : undefined;
  return buildOpenInterestChange(latest.openInterest, previous);
}

export async function appendLiquidation(
  marketType: string,
  symbol: string,
  timeframe: string,
  event: { side: "BUY" | "SELL"; qty: number; notional: number; timestamp: number },
): Promise<void> {
  const key = liquidationKey(marketType, symbol, timeframe);
  await getRedis()
    .multi()
    .zadd(key, event.timestamp, JSON.stringify(event))
    .zremrangebyscore(key, "-inf", Date.now() - timeframeToMs(timeframe) * 500)
    .expire(key, SERIES_TTL_SECONDS)
    .exec();
}

export async function getLiquidationAggregate(
  marketType: string,
  symbol: string,
  timeframe: string,
  lookbackMs = timeframeToMs(timeframe),
): Promise<LiquidationAggregate> {
  const rows = await getRedis().zrangebyscore(liquidationKey(marketType, symbol, timeframe), Date.now() - lookbackMs, "+inf");
  return rows.reduce<LiquidationAggregate>(
    (acc, row) => {
      const event = JSON.parse(row) as { side: "BUY" | "SELL"; qty: number; notional: number };
      if (event.side === "BUY") {
        acc.buyQty += event.qty;
        acc.buyNotional += event.notional;
      } else {
        acc.sellQty += event.qty;
        acc.sellNotional += event.notional;
      }
      return acc;
    },
    { buyQty: 0, sellQty: 0, buyNotional: 0, sellNotional: 0 },
  );
}

function serializeHash(snapshot: DerivativeTickerSnapshot): Record<string, string> {
  return Object.fromEntries(
    Object.entries(snapshot).map(([key, value]) => [key, value === null ? "" : String(value)]),
  );
}

function nullableNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
