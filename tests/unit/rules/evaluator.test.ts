import { describe, it, expect } from "vitest";
import { validateRuleTree, compileDependencies } from "@/src/server/rules/validator";
import { evaluateRuleTree } from "@/src/server/rules/evaluator";
import type { EvaluationContext } from "@/src/server/indicators/indicator-types";

const sampleTree = {
  version: 1 as const,
  root: {
    type: "GROUP" as const,
    id: "root",
    operator: "AND" as const,
    children: [
      {
        type: "CONDITION" as const,
        id: "c1",
        left: { kind: "CONSTANT" as const, value: 25 },
        comparator: "LT" as const,
        right: { kind: "CONSTANT" as const, value: 30 },
      },
    ],
  },
};

describe("rule evaluator", () => {
  it("validates and evaluates simple tree", () => {
    const tree = validateRuleTree(sampleTree);
    const deps = compileDependencies(tree, ["BTCUSDT"]);
    expect(deps.symbols).toContain("BTCUSDT");

    const ctx: EvaluationContext = {
      symbol: "BTCUSDT",
      marketType: "LINEAR",
      getPrice: () => ({ current: 100 }),
      getVolume: () => ({ current: 1000 }),
      getMarketField: () => ({ current: 0 }),
      getIndicator: () => ({ current: 25 }),
    };

    const result = evaluateRuleTree(tree, ctx);
    expect(result.passed).toBe(true);
  });
});
