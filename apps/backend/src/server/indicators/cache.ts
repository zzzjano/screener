import { getRedis } from "../../lib/redis";
import { getIndicatorValue, indicatorCacheKey } from "./indicator-registry";
import type { IndicatorConfigAst } from "../rules/ast";
import type { RollingCandleWindow } from "./indicator-types";

const CACHE_TTL_SECONDS = 300;

export async function getCachedIndicator(
  marketType: string,
  symbol: string,
  timeframe: string,
  candles: RollingCandleWindow,
  config: IndicatorConfigAst,
): Promise<{ current: number; previous?: number }> {
  const redis = getRedis();
  const key = indicatorCacheKey(marketType, symbol, timeframe, config);
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as { current: number; previous?: number };
  }

  const value = getIndicatorValue(candles, config);
  await redis.setex(key, CACHE_TTL_SECONDS, JSON.stringify(value));
  return value;
}

export async function invalidateIndicatorCache(
  marketType: string,
  symbol: string,
  timeframe: string,
): Promise<void> {
  const redis = getRedis();
  const pattern = `indicator:bybit:${marketType}:${symbol}:${timeframe}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}
