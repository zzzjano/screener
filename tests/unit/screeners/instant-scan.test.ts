import { describe, it, expect } from "vitest";
import { buildEvaluationContext } from "@/src/server/rules/evaluation-context";
import { evaluateRuleTree } from "@/src/server/rules/evaluator";
import { validateRuleTree } from "@/src/server/rules/validator";
import type { Candle } from "@/src/server/indicators/indicator-types";
import { mapPool } from "@/src/server/screeners/instant-scan";

function candle(close: number, volume = 1000): Candle {
  return {
    t: Date.now(),
    T: Date.now(),
    o: close,
    h: close,
    l: close,
    c: close,
    v: volume,
    closed: true,
  };
}

describe("evaluation context", () => {
  it("evaluates indicator on right operand with market field on left", () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "c1",
            left: { kind: "PRICE", source: "CLOSE", timeframe: "15m" },
            comparator: "GT",
            right: {
              kind: "INDICATOR",
              indicator: {
                id: "ema-1",
                kind: "EMA",
                timeframe: "15m",
                source: "CLOSE",
                params: { period: 2 },
              },
            },
          },
        ],
      },
    });

    const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const candles = closes.map((value) => candle(value));
    const ctx = buildEvaluationContext("BTCUSDT", "LINEAR", new Map([["15m", candles]]));

    const result = evaluateRuleTree(tree, ctx);
    expect(result.passed).toBe(true);
  });
});

describe("mapPool", () => {
  it("processes items with limited concurrency", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapPool([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
