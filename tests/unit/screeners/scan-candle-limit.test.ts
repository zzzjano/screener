import { describe, it, expect } from "vitest";
import { computeScanCandleLimit } from "@/src/server/screeners/scan-candle-limit";
import { compileDependencies } from "@/src/server/rules/validator";
import type { RuleTree } from "@/src/server/rules/ast";

describe("computeScanCandleLimit", () => {
  it("uses minimal bars for simple price rules", () => {
    const tree = {
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "c1",
            left: { kind: "PRICE", source: "CLOSE", timeframe: "1m" },
            comparator: "GT",
            right: { kind: "CONSTANT", value: 0 },
          },
        ],
      },
    } satisfies RuleTree;

    const deps = compileDependencies(tree, []);
    expect(computeScanCandleLimit(tree, deps)).toBe(3);
  });

  it("uses warmup bars when indicators are present", () => {
    const tree = {
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "c1",
            left: {
              kind: "INDICATOR",
              indicator: {
                id: "rsi-1",
                kind: "RSI",
                timeframe: "15m",
                source: "CLOSE",
                params: { period: 14 },
              },
            },
            comparator: "LT",
            right: { kind: "CONSTANT", value: 30 },
          },
        ],
      },
    } satisfies RuleTree;

    const deps = compileDependencies(tree, []);
    expect(computeScanCandleLimit(tree, deps)).toBe(deps.maxWarmupBars);
  });
});
