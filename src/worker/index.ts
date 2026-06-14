import { createMarketSyncWorker } from "../server/jobs/processors/market-sync.processor";
import { createBackfillWorker } from "../server/jobs/processors/backfill.processor";
import { createScreenerEvaluateWorker } from "../server/jobs/processors/screener-evaluate.processor";
import { createAlertDeliveryWorker } from "../server/jobs/processors/alert-delivery.processor";
import { startWebSocketIngest } from "../server/jobs/processors/websocket-ingest.processor";
import { marketSyncQueue, backfillQueue } from "../server/jobs/queues";
import { syncBybitMarkets } from "../server/market-data/bybit-symbols";
import { logger } from "../lib/logger";
import { disconnectRedis } from "../lib/redis";
import { prisma } from "../lib/prisma";

const workers = [
  createMarketSyncWorker(),
  createBackfillWorker(),
  createScreenerEvaluateWorker(),
  createAlertDeliveryWorker(),
];

async function bootstrap(): Promise<void> {
  logger.info("Uruchamianie workera Crypto Screener");

  await syncBybitMarkets();
  await marketSyncQueue.add("sync", {}, { jobId: `boot-sync-${Date.now()}` });

  await startWebSocketIngest();

  await backfillQueue.add("bootstrap", {
    marketType: "LINEAR",
    symbol: "BTCUSDT",
    timeframe: "15m",
    requiredBars: 200,
  });

  logger.info("Worker gotowy", { workers: workers.length });
}

void bootstrap();

async function shutdown(): Promise<void> {
  logger.info("Zamykanie workera...");
  await Promise.all(workers.map((w) => w.close()));
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
