import { ApiKeyStatus } from "@prisma/client";
import { Worker } from "bullmq";
import { getBullMqConnection } from "../../../lib/bullmq";
import { prisma } from "../../../lib/prisma";
import { syncPortfolioCredential } from "../../portfolio/portfolio-sync";

interface PortfolioSyncJob {
  userId?: string;
  credentialId?: string;
}

export function createPortfolioSyncWorker(): Worker {
  return new Worker<PortfolioSyncJob>(
    "portfolio-sync",
    async (job) => {
      if (job.data.userId && job.data.credentialId) {
        return syncPortfolioCredential({
          userId: job.data.userId,
          credentialId: job.data.credentialId,
        });
      }

      const credentials = await prisma.userExchangeCredential.findMany({
        where: { exchange: "bybit", status: ApiKeyStatus.ACTIVE },
        select: { id: true, userId: true },
      });

      let synced = 0;
      for (const credential of credentials) {
        const result = await syncPortfolioCredential({
          userId: credential.userId,
          credentialId: credential.id,
        });
        if (!result.skipped) synced++;
      }
      return { synced };
    },
    { connection: getBullMqConnection(), concurrency: 2 },
  );
}
