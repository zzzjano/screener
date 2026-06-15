import { Worker } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import { runBacktest } from "../../backtesting/backtest-engine";

interface BacktestRunJob {
  backtestRunId: string;
}

export function createBacktestRunWorker(): Worker {
  return new Worker<BacktestRunJob>(
    "backtest-run",
    async (job) => runBacktest(job.data.backtestRunId),
    { connection: getBullMqConnection(), concurrency: 1 },
  );
}
