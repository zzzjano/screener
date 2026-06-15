import { Queue } from "bullmq";
import { getBullMqConnection } from "../../lib/bullmq";
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

export const marketStreamConsumerQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("market-stream-consumer").add(...args),
};

export const evaluationDispatchQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("evaluation-dispatch").add(...args),
};

export const sectorSyncQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("sector-sync").add(...args),
};

export const historicalBackfillQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("historical-backfill").add(...args),
};

export const backtestRunQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("backtest-run").add(...args),
};

export const portfolioSyncQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("portfolio-sync").add(...args),
};

export const liveScanQueue = {
  add: (...args: Parameters<Queue["add"]>) => getQueue("live-scan").add(...args),
  getJob: async (jobId: string) => getQueue("live-scan").getJob(jobId),
};

export async function emitCandleClosed(event: CandleClosedEvent): Promise<void> {
  await screenerEvaluateQueue.add(
    "candle.closed",
    event,
    {
      jobId: `eval-${event.symbol}-${event.timeframe}-${event.candle.T}`,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  );
}
