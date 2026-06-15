import { Worker } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import { createCcxtMarketSession } from "../../market-data/ccxt-client";
import { fetchHistoricalChunk } from "../../backtesting/bybit-history-client";
import { upsertHistoricalCandles } from "../../backtesting/historical-candle-store";

interface HistoricalBackfillJob {
  marketType: string;
  symbol: string;
  timeframe: string;
  startMs: number;
  endMs: number;
}

export function createHistoricalBackfillWorker(): Worker {
  return new Worker<HistoricalBackfillJob>(
    "historical-backfill",
    async (job) => {
      const session = await createCcxtMarketSession();
      const candles = await fetchHistoricalChunk({
        symbol: job.data.symbol,
        timeframe: job.data.timeframe,
        sinceMs: job.data.startMs,
        session,
      });
      const bounded = candles.filter((candle) => candle.t >= job.data.startMs && candle.t < job.data.endMs);
      const inserted = await upsertHistoricalCandles({
        marketType: job.data.marketType,
        symbol: job.data.symbol,
        timeframe: job.data.timeframe,
        candles: bounded,
      });
      return { inserted };
    },
    { connection: getBullMqConnection(), concurrency: 2 },
  );
}
