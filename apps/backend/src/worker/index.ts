import { createMarketSyncWorker } from "../server/jobs/processors/market-sync.processor";
import { createBackfillWorker } from "../server/jobs/processors/backfill.processor";
import { createScreenerEvaluateWorker } from "../server/jobs/processors/screener-evaluate.processor";
import { createAlertDeliveryWorker } from "../server/jobs/processors/alert-delivery.processor";
import { startWebSocketIngest, createSubscriptionSyncWorker } from "../server/jobs/processors/websocket-ingest.processor";
import {
  marketSyncQueue,
  backfillQueue,
  marketStreamConsumerQueue,
  evaluationDispatchQueue,
  sectorSyncQueue,
  portfolioSyncQueue,
} from "../server/jobs/queues";
import { createMarketStreamConsumerWorker } from "../server/jobs/processors/market-stream-consumer.processor";
import { createEvaluationDispatchWorker } from "../server/jobs/processors/evaluation-dispatch.processor";
import { createSectorSyncWorker } from "../server/jobs/processors/sector-sync.processor";
import { createHistoricalBackfillWorker } from "../server/jobs/processors/historical-backfill.processor";
import { createBacktestRunWorker } from "../server/jobs/processors/backtest-run.processor";
import { createPortfolioSyncWorker } from "../server/jobs/processors/portfolio-sync.processor";
import { createLiveScanWorker } from "../server/jobs/processors/live-scan.processor";
import { syncBybitMarkets } from "../server/market-data/bybit-symbols";
import { logger } from "../lib/logger";
import { disconnectRedis } from "../lib/redis";
import { prisma } from "../lib/prisma";

const workers = [
  createMarketSyncWorker(),
  createBackfillWorker(),
  createScreenerEvaluateWorker(),
  createAlertDeliveryWorker(),
  createSubscriptionSyncWorker(),
  createMarketStreamConsumerWorker(),
  createEvaluationDispatchWorker(),
  createSectorSyncWorker(),
  createHistoricalBackfillWorker(),
  createBacktestRunWorker(),
  createPortfolioSyncWorker(),
  createLiveScanWorker(),
];

async function bootstrap(): Promise<void> {
  logger.info("Uruchamianie workera Crypto Screener");

  await syncBybitMarkets();
  await marketSyncQueue.add("sync", {}, { jobId: `boot-sync-${Date.now()}` });

  await startWebSocketIngest();
  await marketStreamConsumerQueue.add(
    "drain",
    {},
    { repeat: { every: 1_000 }, jobId: "market-stream-consumer-repeat" },
  );
  await evaluationDispatchQueue.add(
    "drain",
    {},
    { repeat: { every: 1_000 }, jobId: "evaluation-dispatch-repeat" },
  );
  await sectorSyncQueue.add(
    "sync",
    {},
    { repeat: { every: 24 * 60 * 60 * 1000 }, jobId: "sector-sync-daily" },
  );
  await portfolioSyncQueue.add(
    "sync",
    {},
    { repeat: { every: 60_000 }, jobId: "portfolio-sync-repeat" },
  );

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
