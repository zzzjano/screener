import { existsSync } from "node:fs";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import type { IndicatorConfigAst } from "../rules/ast";
import type { Candle } from "./indicator-types";
import { getIndicatorValue } from "./indicator-registry";
import type { IndicatorExecutionEngine } from "./indicator-execution-engine";

interface WorkerResult {
  current: number;
  previous?: number;
}

function resolveWorkerPath(): string | null {
  const candidates = [
    join(process.cwd(), "src/server/indicators/indicator-worker.thread.js"),
    join(process.cwd(), ".next/server/indicators/indicator-worker.thread.js"),
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}

class WorkerIndicatorExecutionEngine implements IndicatorExecutionEngine {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<
    number,
    { resolve: (v: WorkerResult) => void; reject: (e: Error) => void }
  >();

  private getWorker(): Worker | null {
    if (this.worker) return this.worker;
    const workerPath = resolveWorkerPath();
    if (!workerPath) return null;

    this.worker = new Worker(workerPath);
    this.worker.on("message", (msg: { id: number; result?: WorkerResult; error?: string }) => {
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(msg.error));
      else pending.resolve(msg.result ?? { current: NaN });
    });
    this.worker.on("error", () => {
      for (const [, pending] of this.pending) {
        pending.reject(new Error("Worker error"));
      }
      this.pending.clear();
      this.worker = null;
    });

    return this.worker;
  }

  async getIndicator(candles: Candle[], config: IndicatorConfigAst): Promise<WorkerResult> {
    const worker = this.getWorker();
    if (!worker) {
      return getIndicatorValue(candles, config);
    }

    try {
      const id = ++this.seq;
      return await new Promise<WorkerResult>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        worker.postMessage({ id, candles, config });
      });
    } catch {
      return getIndicatorValue(candles, config);
    }
  }

  async dispose() {
    await this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}

export function createWorkerIndicatorExecutionEngine(): IndicatorExecutionEngine {
  return new WorkerIndicatorExecutionEngine();
}
