import { describe, it, expect } from "vitest";
import { buildScanDependencyGraph } from "@/src/server/screeners/scan-dependencies";
import { validateRuleTree } from "@/src/server/rules/validator";

describe("buildScanDependencyGraph", () => {
  it("deduplicates candle fetches for multiple indicators on the same timeframe", () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "ema",
            left: {
              kind: "INDICATOR",
              indicator: {
                id: "ema-50",
                kind: "EMA",
                timeframe: "15m",
                source: "CLOSE",
                params: { period: 50 },
              },
            },
            comparator: "GT",
            right: { kind: "CONSTANT", value: 0 },
          },
          {
            type: "CONDITION",
            id: "rsi",
            left: {
              kind: "INDICATOR",
              indicator: {
                id: "rsi-14",
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
    });

    const graph = buildScanDependencyGraph(tree);
    expect(graph.timeframes).toEqual(["15m"]);
    expect(graph.indicatorsByTimeframe["15m"]).toHaveLength(2);
    expect(graph.candleWindowsByTimeframe["15m"]).toBeGreaterThanOrEqual(50);
  });

  it("calculates candle windows per timeframe from indicators on that timeframe only", () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "rsi",
            left: {
              kind: "INDICATOR",
              indicator: {
                id: "rsi-14",
                kind: "RSI",
                timeframe: "1m",
                source: "CLOSE",
                params: { period: 14 },
              },
            },
            comparator: "LT",
            right: { kind: "CONSTANT", value: 30 },
          },
          {
            type: "CONDITION",
            id: "ema",
            left: {
              kind: "INDICATOR",
              indicator: {
                id: "ema-200",
                kind: "EMA",
                timeframe: "1h",
                source: "CLOSE",
                params: { period: 200 },
              },
            },
            comparator: "GT",
            right: { kind: "CONSTANT", value: 0 },
          },
        ],
      },
    });

    const graph = buildScanDependencyGraph(tree);
    expect(graph.candleWindowsByTimeframe["1m"]).toBe(19);
    expect(graph.candleWindowsByTimeframe["1h"]).toBe(205);
    expect(graph.maxWarmupBars).toBe(205);
  });
});
