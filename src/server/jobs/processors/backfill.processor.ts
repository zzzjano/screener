import { Worker } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import { backfillRollingWindow } from "../../market-data/backfill";
import { withRateLimitBackoff } from "../../market-data/rate-limit";

interface BackfillJob {
  marketType: string;
  symbol: string;
  timeframe: string;
  requiredBars?: number;
}

export function createBackfillWorker(): Worker {
  return new Worker<BackfillJob>(
    "backfill",
    async (job) => {
      const { marketType, symbol, timeframe, requiredBars = 200 } = job.data;
      const count = await withRateLimitBackoff(() =>
        backfillRollingWindow(marketType, symbol, timeframe, requiredBars),
      );
      return { count };
    },
    { connection: getBullMqConnection(), concurrency: 3 },
  );
}
