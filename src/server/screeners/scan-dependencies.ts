import type { IndicatorConfigAst, RuleNode, RuleTree } from "../rules/ast";
import { getIndicatorWarmup } from "../indicators/indicator-registry";

export interface ScanDependencyGraph {
  timeframes: string[];
  candleWindowsByTimeframe: Record<string, number>;
  indicatorsByTimeframe: Record<string, IndicatorConfigAst[]>;
  maxWarmupBars: number;
}

function collectOperandTimeframes(
  operand: { kind: string; timeframe?: string; indicator?: IndicatorConfigAst },
  timeframes: Set<string>,
  indicators: Map<string, IndicatorConfigAst>,
): void {
  if ("timeframe" in operand && operand.timeframe) {
    timeframes.add(operand.timeframe);
  }
  if (operand.kind === "INDICATOR" && operand.indicator) {
    indicators.set(operand.indicator.id, operand.indicator);
    timeframes.add(operand.indicator.timeframe);
  }
}

function walkNode(
  node: RuleNode,
  timeframes: Set<string>,
  indicators: Map<string, IndicatorConfigAst>,
): void {
  if (node.type === "CONDITION") {
    collectOperandTimeframes(node.left, timeframes, indicators);
    collectOperandTimeframes(node.right, timeframes, indicators);
    return;
  }
  for (const child of node.children) {
    walkNode(child, timeframes, indicators);
  }
}

export function buildScanDependencyGraph(tree: RuleTree): ScanDependencyGraph {
  const timeframes = new Set<string>();
  const indicators = new Map<string, IndicatorConfigAst>();
  walkNode(tree.root, timeframes, indicators);

  const indicatorList = Array.from(indicators.values());
  let maxWarmupBars = 3;
  for (const indicator of indicatorList) {
    maxWarmupBars = Math.max(maxWarmupBars, getIndicatorWarmup(indicator.kind, indicator.params));
  }
  maxWarmupBars += 10;

  const candleWindowsByTimeframe: Record<string, number> = {};
  const indicatorsByTimeframe: Record<string, IndicatorConfigAst[]> = {};

  for (const tf of timeframes) {
    candleWindowsByTimeframe[tf] = maxWarmupBars;
    indicatorsByTimeframe[tf] = indicatorList.filter((ind) => ind.timeframe === tf);
  }

  if (timeframes.size === 0) {
    candleWindowsByTimeframe["15m"] = maxWarmupBars;
    indicatorsByTimeframe["15m"] = [];
  }

  return {
    timeframes: Array.from(timeframes.size > 0 ? timeframes : ["15m"]),
    candleWindowsByTimeframe,
    indicatorsByTimeframe,
    maxWarmupBars,
  };
}
