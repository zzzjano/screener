import { Worker, type Job } from "bullmq";
import { getBullMqConnection } from "../../../lib/bullmq";
import { syncBybitMarkets } from "../../market-data/bybit-symbols";
import { logger } from "../../../lib/logger";

export function createMarketSyncWorker(): Worker {
  return new Worker(
    "market-sync",
    async () => {
      const count = await syncBybitMarkets();
      return { count };
    },
    { connection: getBullMqConnection(), concurrency: 1 },
  );
}

export function scheduleMarketSync(): void {
  void import("../../market-data/candle-events").then(({ marketSyncQueue }) =>
    marketSyncQueue.add(
      "sync",
      {},
      { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: "market-sync-repeat" },
    ),
  );
}
