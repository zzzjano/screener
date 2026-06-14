import type { IndicatorConfigAst } from "../rules/ast";
import type { Candle } from "./indicator-types";
import { getIndicatorValue } from "./indicator-registry";

export interface IndicatorExecutionEngine {
  getIndicator(
    candles: Candle[],
    config: IndicatorConfigAst,
  ): Promise<{ current: number; previous?: number }>;
  dispose(): Promise<void>;
}

export class InlineIndicatorExecutionEngine implements IndicatorExecutionEngine {
  async getIndicator(candles: Candle[], config: IndicatorConfigAst) {
    return getIndicatorValue(candles, config);
  }

  async dispose() {}
}

export const WORKLOAD_THRESHOLD = 5_000;

export function shouldUseWorkerEngine(symbolWorkload: number, indicatorCount: number): boolean {
  return indicatorCount > 0 && symbolWorkload >= WORKLOAD_THRESHOLD;
}

/**
 * Returns inline engine in the Next.js web process. Worker-thread offload is available
 * via `createWorkerIndicatorExecutionEngine()` for standalone worker scripts.
 */
export function createIndicatorExecutionEngine(_options: {
  symbolWorkload: number;
  indicatorCount: number;
}): IndicatorExecutionEngine {
  return new InlineIndicatorExecutionEngine();
}
