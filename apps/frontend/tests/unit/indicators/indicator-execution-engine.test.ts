import { describe, it, expect } from "vitest";
import {
  createIndicatorExecutionEngine,
  InlineIndicatorExecutionEngine,
  shouldUseWorkerEngine,
  WORKLOAD_THRESHOLD,
} from "@/src/server/indicators/indicator-execution-engine";
import { createWorkerIndicatorExecutionEngine } from "@/src/server/indicators/indicator-worker-engine";

describe("indicator execution engine selection", () => {
  it("uses inline engine in the web scan path", () => {
    const engine = createIndicatorExecutionEngine({
      symbolWorkload: 100,
      indicatorCount: 2,
    });
    expect(engine).toBeInstanceOf(InlineIndicatorExecutionEngine);
  });

  it("flags heavy workloads for optional worker offload", () => {
    expect(shouldUseWorkerEngine(WORKLOAD_THRESHOLD, 0)).toBe(false);
    expect(shouldUseWorkerEngine(WORKLOAD_THRESHOLD - 1, 3)).toBe(false);
    expect(shouldUseWorkerEngine(WORKLOAD_THRESHOLD, 3)).toBe(true);
  });

  it("exposes worker engine factory for standalone worker scripts", () => {
    const engine = createWorkerIndicatorExecutionEngine();
    expect(engine).toBeDefined();
    expect(typeof engine.getIndicator).toBe("function");
  });
});
