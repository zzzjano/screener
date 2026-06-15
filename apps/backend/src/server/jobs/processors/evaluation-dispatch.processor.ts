import { Worker } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import {
  ackMarketStreamBatch,
  MARKET_STREAM_GROUPS,
  MARKET_STREAMS,
  readMarketStreamBatch,
} from "../../market-data/streams/market-events";
import { emitCandleClosed } from "../../market-data/candle-events";
import { writeMarketDeadLetter } from "../../market-data/streams/dead-letter";

const CONSUMER_NAME = `evaluation-dispatch-${process.pid}`;

export function createEvaluationDispatchWorker(): Worker {
  return new Worker(
    "evaluation-dispatch",
    async () => {
      const rows = await readMarketStreamBatch(
        MARKET_STREAMS.kline,
        MARKET_STREAM_GROUPS.evaluationDispatch,
        CONSUMER_NAME,
      );
      const ackIds: string[] = [];
      let dispatched = 0;

      for (const row of rows) {
        try {
          if (row.event.eventType === "kline" && row.event.candle.closed) {
            await emitCandleClosed({
              exchange: row.event.exchange,
              marketType: row.event.marketType,
              symbol: row.event.symbol,
              timeframe: row.event.timeframe,
              candle: row.event.candle,
            });
            dispatched++;
          }
        } catch (error) {
          await writeMarketDeadLetter({
            stream: MARKET_STREAMS.kline,
            id: row.id,
            reason: error instanceof Error ? error.message : String(error),
            payload: row.event,
          });
        }
        ackIds.push(row.id);
      }

      await ackMarketStreamBatch(MARKET_STREAMS.kline, MARKET_STREAM_GROUPS.evaluationDispatch, ackIds);
      return { dispatched };
    },
    { connection: getBullMqConnection(), concurrency: 1 },
  );
}
