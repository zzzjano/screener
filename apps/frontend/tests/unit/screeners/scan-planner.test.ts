import { describe, it, expect } from "vitest";
import { buildScanPlan, getConditionDataCost } from "@/src/server/screeners/scan-planner";
import { validateRuleTree } from "@/src/server/rules/validator";
import type { ConditionNode } from "@/src/server/rules/ast";

function priceCondition(comparator: "GT" | "LT" = "GT", value = 0): ConditionNode {
  return {
    type: "CONDITION",
    id: "c1",
    left: { kind: "PRICE", source: "CLOSE", timeframe: "1m" },
    comparator,
    right: { kind: "CONSTANT", value },
  };
}

describe("buildScanPlan", () => {
  it("classifies Cena > 0 as ticker-only", () => {
    const tree = validateRuleTree({
      version: 1,
      root: { type: "GROUP", id: "root", operator: "AND", children: [priceCondition()] },
    });
    const plan = buildScanPlan(tree);
    expect(plan.isTickerOnly).toBe(true);
    expect(getConditionDataCost(priceCondition())).toBe("ticker");
  });

  it("classifies timeframe volume rules as candle-required", () => {
    const volumeCondition: ConditionNode = {
      type: "CONDITION",
      id: "v1",
      left: { kind: "VOLUME", timeframe: "1m" },
      comparator: "GT",
      right: { kind: "CONSTANT", value: 1_000_000 },
    };
    const tree = validateRuleTree({
      version: 1,
      root: { type: "GROUP", id: "root", operator: "AND", children: [volumeCondition] },
    });
    expect(buildScanPlan(tree).isTickerOnly).toBe(false);
    expect(getConditionDataCost(volumeCondition)).toBe("candle");
  });

  it("classifies TICKER_VOLUME rules as ticker-only", () => {
    const volume24hCondition: ConditionNode = {
      type: "CONDITION",
      id: "tv1",
      left: { kind: "TICKER_VOLUME" },
      comparator: "GT",
      right: { kind: "CONSTANT", value: 1_000_000 },
    };
    const tree = validateRuleTree({
      version: 1,
      root: { type: "GROUP", id: "root", operator: "AND", children: [volume24hCondition] },
    });
    expect(buildScanPlan(tree).isTickerOnly).toBe(true);
    expect(getConditionDataCost(volume24hCondition)).toBe("ticker");
  });

  it("requires candles for RSI rules", () => {
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
    });
    expect(buildScanPlan(tree).isTickerOnly).toBe(false);
  });

  it("requires candles for CROSSES_ABOVE", () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "cross",
            left: { kind: "PRICE", source: "CLOSE", timeframe: "15m" },
            comparator: "CROSSES_ABOVE",
            right: {
              kind: "INDICATOR",
              indicator: {
                id: "ema-1",
                kind: "EMA",
                timeframe: "15m",
                source: "CLOSE",
                params: { period: 20 },
              },
            },
          },
        ],
      },
    });
    const plan = buildScanPlan(tree);
    expect(plan.isTickerOnly).toBe(false);
    expect(plan.usesHistoryComparators).toBe(true);
  });
});
