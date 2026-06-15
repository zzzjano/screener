import { logger } from "../../lib/logger";

let lastRequestAt = 0;
let backoffMs = 0;

export async function withRateLimitBackoff<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + backoffMs - now);
  if (wait > 0) await sleep(wait);

  try {
    const result = await fn();
    backoffMs = 0;
    lastRequestAt = Date.now();
    return result;
  } catch (error) {
    if (isRateLimitError(error)) {
      backoffMs = backoffMs === 0 ? 1000 : Math.min(backoffMs * 2, 30_000);
      logger.warn("Rate limit Bybit - backoff", { backoffMs });
    }
    throw error;
  }
}

function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("RateLimit") || msg.includes("10006") || msg.includes("429");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
