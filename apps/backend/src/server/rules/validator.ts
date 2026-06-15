import { createHash } from "crypto";
import { VALID_TIMEFRAMES, ruleTreeSchema, type RuleNode, type RuleTree, type ScreenerDependency, type IndicatorConfigAst } from "./ast";
import { getIndicatorWarmup } from "../indicators/indicator-registry";

export function validateRuleTree(input: unknown): RuleTree {
  return ruleTreeSchema.parse(input);
}

export function hashRuleTree(tree: RuleTree): string {
  return createHash("sha256").update(JSON.stringify(tree)).digest("hex");
}

function collectFromOperand(
  operand: { kind: string; timeframe?: string; indicator?: IndicatorConfigAst },
  timeframes: Set<string>,
  indicators: Map<string, IndicatorConfigAst>,
): void {
  if ("timeframe" in operand && typeof operand.timeframe === "string" && VALID_TIMEFRAMES.includes(operand.timeframe as any)) {
    timeframes.add(operand.timeframe);
  }
  if (operand.kind === "INDICATOR" && operand.indicator) {
    indicators.set(operand.indicator.id, operand.indicator);
    if (VALID_TIMEFRAMES.includes(operand.indicator.timeframe as any)) {
      timeframes.add(operand.indicator.timeframe);
    }
  }
}

function walkNode(
  node: RuleNode,
  timeframes: Set<string>,
  indicators: Map<string, IndicatorConfigAst>,
): void {
  if (node.type === "CONDITION") {
    collectFromOperand(node.left, timeframes, indicators);
    collectFromOperand(node.right, timeframes, indicators);
    return;
  }
  for (const child of node.children) {
    walkNode(child, timeframes, indicators);
  }
}

export function compileDependencies(
  tree: RuleTree,
  symbols: string[],
  screenerTimeframes: string[] = [],
): ScreenerDependency {
  const timeframes = new Set<string>(
    screenerTimeframes.filter((tf) => VALID_TIMEFRAMES.includes(tf as any))
  );
  const indicators = new Map<string, IndicatorConfigAst>();
  walkNode(tree.root, timeframes, indicators);

  const indicatorList = Array.from(indicators.values());
  let maxWarmupBars = 50;
  for (const ind of indicatorList) {
    maxWarmupBars = Math.max(maxWarmupBars, getIndicatorWarmup(ind.kind, ind.params));
  }

  return {
    symbols,
    timeframes: Array.from(timeframes),
    indicators: indicatorList,
    maxWarmupBars: maxWarmupBars + 10,
  };
}
