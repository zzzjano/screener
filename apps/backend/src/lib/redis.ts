import Redis from "ioredis";
import { env } from "./env";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return globalForRedis.redis;
}

export async function disconnectRedis(): Promise<void> {
  if (globalForRedis.redis) {
    await globalForRedis.redis.quit();
    globalForRedis.redis = undefined;
  }
}
