import { getRedis } from "../../lib/redis";
import type { OHLCV } from "ccxt";
import type { Candle } from "../indicators/indicator-types";
import { ohlcvKey } from "../indicators/dependency-planner";
import { timeframeToMs } from "./timeframe";
import { logger } from "../../lib/logger";

const DEFAULT_MAX_CANDLES = 500;

export async function getRollingWindow(
  marketType: string,
  symbol: string,
  timeframe: string,
  exchange = "bybit",
  limit?: number,
): Promise<Candle[]> {
  const redis = getRedis();
  const key = ohlcvKey(exchange, marketType, symbol, timeframe);
  
  if (limit !== undefined && limit > 0) {
    const raw = await redis.zrevrange(key, 0, limit - 1);
    const candles = raw.map((item) => JSON.parse(item) as Candle).reverse();
    if (candles.length > 0) {
      const oldest = new Date(candles[0].T).toISOString();
      const newest = new Date(candles[candles.length - 1].T).toISOString();
      logger.debug(`[Audit] ${symbol} ${timeframe} - Oldest: ${oldest}, Newest: ${newest} (Bars: ${candles.length})`);
    }
    return candles;
  }
  
  const raw = await redis.zrange(key, 0, -1);
  return raw.map((item) => JSON.parse(item) as Candle);
}

export async function getFreshRollingWindow(
  marketType: string,
  symbol: string,
  timeframe: string,
  requiredBars: number,
  maxAgeMs?: number,
  exchange = "bybit",
): Promise<Candle[] | null> {
  const candles = await getRollingWindow(marketType, symbol, timeframe, exchange, requiredBars);
  if (candles.length < requiredBars) return null;

  const last = candles[candles.length - 1];
  const ageLimit = maxAgeMs ?? timeframeToMs(timeframe) * 2;
  if (Date.now() - last.T > ageLimit) return null;

  return candles;
}

export async function upsertCandle(
  marketType: string,
  symbol: string,
  timeframe: string,
  candle: Candle,
  maxCandles = DEFAULT_MAX_CANDLES,
  exchange = "bybit",
): Promise<boolean> {
  const redis = getRedis();
  const key = ohlcvKey(exchange, marketType, symbol, timeframe);
  const score = candle.t;
  const value = JSON.stringify(candle);

  const existing = await redis.zrangebyscore(key, score, score);
  if (existing.length > 0) {
    await redis.zremrangebyscore(key, score, score);
  }

  await redis.zadd(key, score, value);
  const count = await redis.zcard(key);
  if (count > maxCandles) {
    await redis.zremrangebyrank(key, 0, count - maxCandles - 1);
  }

  return existing.length === 0;
}

export async function setRollingWindow(
  marketType: string,
  symbol: string,
  timeframe: string,
  candles: Candle[],
  maxCandles = DEFAULT_MAX_CANDLES,
  exchange = "bybit",
): Promise<void> {
  const redis = getRedis();
  const key = ohlcvKey(exchange, marketType, symbol, timeframe);
  await redis.del(key);
  if (candles.length === 0) return;

  const pipeline = redis.pipeline();
  for (const candle of candles) {
    pipeline.zadd(key, candle.t, JSON.stringify(candle));
  }
  await pipeline.exec();

  const count = await redis.zcard(key);
  if (count > maxCandles) {
    await redis.zremrangebyrank(key, 0, count - maxCandles - 1);
  }
}

export function ccxtOhlcvToCandle(row: OHLCV): Candle {
  const [t, o, h, l, c, v] = row;
  return {
    t: t ?? 0,
    T: t ?? 0,
    o: Number(o ?? 0),
    h: Number(h ?? 0),
    l: Number(l ?? 0),
    c: Number(c ?? 0),
    v: Number(v ?? 0),
    closed: true,
  };
}
