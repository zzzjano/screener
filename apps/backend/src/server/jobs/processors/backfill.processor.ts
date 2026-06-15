import { Worker } from "bullmq";
import { getBullMqConnection } from "../../../lib/bullmq";
import { backfillRollingWindow } from "../../market-data/backfill";
import { withRateLimitBackoff } from "../../market-data/rate-limit";
import { getRollingWindow } from "../../market-data/rolling-window-store";
import { emitCandleClosed } from "../../market-data/candle-events";

interface BackfillJob {
  marketType: string;
  symbol: string;
  timeframe: string;
  requiredBars?: number;
  evaluateAfter?: boolean;
}

export function createBackfillWorker(): Worker {
  return new Worker<BackfillJob>(
    "backfill",
    async (job) => {
      const { marketType, symbol, timeframe, requiredBars = 200, evaluateAfter = true } = job.data;
      const count = await withRateLimitBackoff(() =>
        backfillRollingWindow(marketType, symbol, timeframe, requiredBars),
      );

      if (evaluateAfter) {
        const candles = await getRollingWindow(marketType, symbol, timeframe);
        const last = candles[candles.length - 1];
        if (last?.closed) {
          await emitCandleClosed({
            exchange: "bybit",
            marketType,
            symbol,
            timeframe,
            candle: last,
          });
        }
      }

      return { count };
    },
    { connection: getBullMqConnection(), concurrency: 3 },
  );
}
