import { getRedis } from "@/src/lib/redis";
import type { OHLCV } from "ccxt";
import type { Candle } from "../indicators/indicator-types";
import { ohlcvKey } from "../indicators/dependency-planner";

const DEFAULT_MAX_CANDLES = 500;

export async function getRollingWindow(
  marketType: string,
  symbol: string,
  timeframe: string,
  exchange = "bybit",
): Promise<Candle[]> {
  const redis = getRedis();
  const key = ohlcvKey(exchange, marketType, symbol, timeframe);
  const raw = await redis.zrange(key, 0, -1);
  return raw.map((item) => JSON.parse(item) as Candle);
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
