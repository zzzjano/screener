import { getBybitWsClient } from "../../market-data/bybit-ws-client";
import { getRedis } from "../../../lib/redis";
import { dependencyIndexKey } from "../../indicators/dependency-planner";
import { logger } from "../../../lib/logger";
import { Worker } from "bullmq";
import { getBullMqConnection } from "../../../lib/bullmq";

export async function syncWebSocketSubscriptions(): Promise<number> {
  const redis = getRedis();
  const client = getBybitWsClient();

  if (!client.isRunning()) {
    await client.start();
  }

  const keys = await redis.keys("deps:*");
  let count = 0;

  for (const key of keys) {
    const parts = key.split(":");
    if (parts.length < 4) continue;
    const [, , symbol, timeframe] = parts;
    client.subscribe(symbol, timeframe);
    count++;
    logger.info("Synchronizacja subskrypcji WebSocket", { symbol, timeframe });
  }

  return count;
}

export async function startWebSocketIngest(): Promise<void> {
  await syncWebSocketSubscriptions();
  setInterval(() => {
    void syncWebSocketSubscriptions();
  }, 60_000);
}

export async function registerScreenerDependencies(
  screenerId: string,
  marketType: string,
  symbols: string[],
  timeframes: string[],
): Promise<void> {
  const redis = getRedis();

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      const key = dependencyIndexKey(marketType, symbol, timeframe);
      await redis.sadd(key, screenerId);
    }
  }

  const { subscriptionSyncQueue } = await import("../../market-data/candle-events");
  await subscriptionSyncQueue.add("sync", {}, { jobId: `sub-sync-${Date.now()}` });
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

export function createSubscriptionSyncWorker(): Worker {
  return new Worker(
    "subscription-sync",
    async () => {
      const count = await syncWebSocketSubscriptions();
      return { count };
    },
    { connection: getBullMqConnection(), concurrency: 1 },
  );
}
