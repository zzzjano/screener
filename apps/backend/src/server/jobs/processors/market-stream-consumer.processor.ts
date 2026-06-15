import { Worker } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import {
  ackMarketStreamBatch,
  MARKET_STREAM_GROUPS,
  MARKET_STREAMS,
  readMarketStreamBatch,
  type MarketStreamEvent,
} from "../../market-data/streams/market-events";
import { upsertCandle } from "../../market-data/rolling-window-store";
import { appendLiquidation, saveTickerSnapshot } from "../../derivatives/redis-store";
import { writeMarketDeadLetter } from "../../market-data/streams/dead-letter";

const CONSUMER_NAME = `market-cache-${process.pid}`;
const STREAMS = [MARKET_STREAMS.kline, MARKET_STREAMS.ticker, MARKET_STREAMS.liquidation];

export function createMarketStreamConsumerWorker(): Worker {
  return new Worker(
    "market-stream-consumer",
    async () => {
      let processed = 0;
      for (const stream of STREAMS) {
        const rows = await readMarketStreamBatch(
          stream,
          MARKET_STREAM_GROUPS.marketCache,
          CONSUMER_NAME,
        );
        const ackIds: string[] = [];
        for (const row of rows) {
          try {
            await processMarketCacheEvent(row.event);
          } catch (error) {
            await writeMarketDeadLetter({
              stream,
              id: row.id,
              reason: error instanceof Error ? error.message : String(error),
              payload: row.event,
            });
          }
          ackIds.push(row.id);
          processed++;
        }
        await ackMarketStreamBatch(stream, MARKET_STREAM_GROUPS.marketCache, ackIds);
      }
      return { processed };
    },
    { connection: getBullMqConnection(), concurrency: 1 },
  );
}

async function processMarketCacheEvent(event: MarketStreamEvent): Promise<void> {
  if (event.eventType === "kline") {
    if (!event.candle.closed) return;
    await upsertCandle(event.marketType, event.symbol, event.timeframe, event.candle);
    return;
  }

  if (event.eventType === "ticker") {
    await saveTickerSnapshot(event.marketType, {
      symbol: event.symbol,
      price: event.price,
      change24hPct: event.change24hPct,
      fundingRate: event.fundingRate,
      openInterest: event.openInterest,
      openInterestValue: event.openInterestValue,
      turnover24h: event.turnover24h,
      volume24h: event.volume24h,
      timestamp: event.receivedAt,
    });
    return;
  }

  await appendLiquidation(event.marketType, event.symbol, "1m", event);
  await appendLiquidation(event.marketType, event.symbol, "5m", event);
  await appendLiquidation(event.marketType, event.symbol, "15m", event);
  await appendLiquidation(event.marketType, event.symbol, "1h", event);
}
