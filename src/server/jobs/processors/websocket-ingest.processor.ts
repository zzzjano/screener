import { getBybitWsClient } from "../../market-data/bybit-ws-client";
import { getRedis } from "@/src/lib/redis";
import { dependencyIndexKey } from "../../indicators/dependency-planner";
import { logger } from "@/src/lib/logger";

export async function startWebSocketIngest(): Promise<void> {
  const redis = getRedis();
  const client = getBybitWsClient();
  await client.start();

  const keys = await redis.keys("deps:*");
  for (const key of keys) {
    const parts = key.split(":");
    if (parts.length < 4) continue;
    const [, marketType, symbol, timeframe] = parts;
    client.subscribe(symbol, timeframe);
    logger.info("Subskrypcja WebSocket", { symbol, timeframe, marketType });
  }
}

export async function registerScreenerDependencies(
  screenerId: string,
  marketType: string,
  symbols: string[],
  timeframes: string[],
): Promise<void> {
  const redis = getRedis();
  const client = getBybitWsClient();

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      const key = dependencyIndexKey(marketType, symbol, timeframe);
      await redis.sadd(key, screenerId);
      client.subscribe(symbol, timeframe);
    }
  }
}

export async function unregisterScreenerDependencies(
  screenerId: string,
  marketType: string,
  symbols: string[],
  timeframes: string[],
): Promise<void> {
  const redis = getRedis();
  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      const key = dependencyIndexKey(marketType, symbol, timeframe);
      await redis.srem(key, screenerId);
    }
  }
}
