import { Queue } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import type { Candle } from "../indicators/indicator-types";

export interface CandleClosedEvent {
  exchange: string;
  marketType: string;
  symbol: string;
  timeframe: string;
  candle: Candle;
}

const queues = new Map<string, Queue>();

function getQueue(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: getBullMqConnection() });
    queues.set(name, queue);
  }
  return queue;
}

export const marketSyncQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("market-sync").add(...args),
};

export const backfillQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("backfill").add(...args),
};

export const screenerEvaluateQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("screener-evaluate").add(...args),
};

export const alertDeliveryQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("alert-delivery").add(...args),
};

export const subscriptionSyncQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("subscription-sync").add(...args),
};

export async function emitCandleClosed(event: CandleClosedEvent): Promise<void> {
  await screenerEvaluateQueue.add(
    "candle.closed",
    event,
    {
      jobId: `eval:${event.symbol}:${event.timeframe}:${event.candle.T}`,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  );
}
