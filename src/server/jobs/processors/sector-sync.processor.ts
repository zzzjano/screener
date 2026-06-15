import { Worker } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import { syncCoinGeckoSectors } from "../../sectors/sector-sync";

export function createSectorSyncWorker(): Worker {
  return new Worker(
    "sector-sync",
    async () => syncCoinGeckoSectors(),
    { connection: getBullMqConnection(), concurrency: 1 },
  );
}
