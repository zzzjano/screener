import { getRedis } from "../../lib/redis";

export async function isCooldownActive(
  alertId: string,
  cooldownSeconds: number,
): Promise<boolean> {
  const redis = getRedis();
  const key = `alert:cooldown:${alertId}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

export async function setCooldown(alertId: string, cooldownSeconds: number): Promise<void> {
  const redis = getRedis();
  const key = `alert:cooldown:${alertId}`;
  await redis.setex(key, cooldownSeconds, "1");
}
