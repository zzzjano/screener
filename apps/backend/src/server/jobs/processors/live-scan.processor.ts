import { Worker, type Job } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import { logger } from "@/src/lib/logger";
import { runInstantScan } from "../../screeners/instant-scan";

export function createLiveScanWorker(): Worker {
  const worker = new Worker(
    "live-scan",
    async (job: Job) => {
      logger.info(`Przetwarzanie live-scan job: ${job.id}`);
      const { ruleTree } = job.data as { ruleTree: unknown };
      
      const result = await runInstantScan(ruleTree);
      return result;
    },
    {
      connection: getBullMqConnection(),
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    logger.info(`Live-scan job ${job.id} zakończony sukcesem`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`Live-scan job ${job?.id} zakończony błędem`, { error: err.message });
  });

  return worker;
}
