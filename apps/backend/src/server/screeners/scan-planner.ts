import type { Comparator, ConditionNode, Operand, RuleNode, RuleTree } from "../rules/ast";
import { compileDependencies } from "../rules/validator";
import { computeScanCandleLimit } from "./scan-candle-limit";

const HISTORY_COMPARATORS = new Set<Comparator>([
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "PERCENT_CHANGE_GT",
  "PERCENT_CHANGE_LT",
  "VOLUME_SPIKE",
]);

export type DataCost = "ticker" | "metadata" | "private" | "derivative" | "candle" | "indicator";

export interface ScanPlan {
  tree: RuleTree;
  isTickerOnly: boolean;
  primaryTimeframe: string;
  candleLimit: number;
  candleWindowsByTimeframe: Record<string, number>;
  indicatorCount: number;
  symbolWorkload: number;
  usesHistoryComparators: boolean;
}

function operandNeedsCandles(operand: Operand): boolean {
  if (operand.kind === "INDICATOR") return true;
  if (operand.kind === "PRICE" || operand.kind === "VOLUME" || operand.kind === "MARKET_FIELD") {
    return true;
  }
  return false;
}

function conditionNeedsHistory(node: ConditionNode): boolean {
  return HISTORY_COMPARATORS.has(node.comparator);
}

function conditionNeedsIndicators(node: ConditionNode): boolean {
  return node.left.kind === "INDICATOR" || node.right.kind === "INDICATOR";
}

function conditionNeedsDerivative(node: ConditionNode): boolean {
  return (
    node.left.kind === "OPEN_INTEREST" ||
    node.right.kind === "OPEN_INTEREST" ||
    node.left.kind === "LIQUIDATION" ||
    node.right.kind === "LIQUIDATION" ||
    node.left.kind === "FUNDING_RATE" ||
    node.right.kind === "FUNDING_RATE"
  );
}

function conditionNeedsMetadata(node: ConditionNode): boolean {
  return node.left.kind === "SECTOR" || node.right.kind === "SECTOR";
}

function conditionNeedsPrivateContext(node: ConditionNode): boolean {
  return (
    node.left.kind === "PORTFOLIO" ||
    node.right.kind === "PORTFOLIO" ||
    node.left.kind === "POSITION" ||
    node.right.kind === "POSITION"
  );
}

function conditionNeedsCandles(node: ConditionNode): boolean {
  if (conditionNeedsHistory(node) || conditionNeedsIndicators(node)) return true;
  if (operandNeedsCandles(node.left) || operandNeedsCandles(node.right)) return true;
  return false;
}

function canEvaluateFromTickerOnly(operand: Operand): boolean {
  if (operand.kind === "CONSTANT") return true;
  if (operand.kind === "PRICE") return operand.source === "CLOSE";
  if (operand.kind === "TICKER_VOLUME") return true;
  return false;
}

function operandUsesTickerData(operand: Operand): boolean {
  return operand.kind === "TICKER_VOLUME";
}

function walkOperands(node: RuleNode, visitor: (operand: Operand) => void): void {
  if (node.type === "CONDITION") {
    visitor(node.left);
    visitor(node.right);
    return;
  }
  for (const child of node.children) {
    walkOperands(child, visitor);
  }
}

export function ruleTreeUsesTickerOperands(tree: RuleTree): boolean {
  let usesTicker = false;
  walkOperands(tree.root, (operand) => {
    if (operandUsesTickerData(operand)) usesTicker = true;
  });
  return usesTicker;
}

function conditionIsTickerOnly(node: ConditionNode): boolean {
  if (conditionNeedsHistory(node) || conditionNeedsIndicators(node)) return false;
  if (!canEvaluateFromTickerOnly(node.left) || !canEvaluateFromTickerOnly(node.right)) {
    return false;
  }
  return true;
}

function walkTickerOnly(node: RuleNode): boolean {
  if (node.type === "CONDITION") return conditionIsTickerOnly(node);
  return node.children.every(walkTickerOnly);
}

function walkUsesHistory(node: RuleNode): boolean {
  if (node.type === "CONDITION") return conditionNeedsHistory(node);
  return node.children.some(walkUsesHistory);
}

export function getConditionDataCost(node: ConditionNode): DataCost {
  if (conditionIsTickerOnly(node)) return "ticker";
  if (conditionNeedsMetadata(node)) return "metadata";
  if (conditionNeedsPrivateContext(node)) return "private";
  if (conditionNeedsDerivative(node)) return "derivative";
  if (conditionNeedsIndicators(node)) return "indicator";
  return "candle";
}

export function sortChildrenByCost(children: RuleNode[]): RuleNode[] {
  const costRank: Record<DataCost, number> = {
    metadata: 0,
    ticker: 1,
    private: 2,
    derivative: 3,
    candle: 4,
    indicator: 5,
  };
  return [...children].sort((a, b) => {
    const aCost = a.type === "CONDITION" ? costRank[getConditionDataCost(a)] : 1;
    const bCost = b.type === "CONDITION" ? costRank[getConditionDataCost(b)] : 1;
    return aCost - bCost;
  });
}

export function buildScanPlan(tree: RuleTree): ScanPlan {
  const deps = compileDependencies(tree, []);
  const timeframes = deps.timeframes.length > 0 ? deps.timeframes : ["15m"];
  const candleLimit = computeScanCandleLimit(tree, deps);
  const candleWindowsByTimeframe = Object.fromEntries(
    timeframes.map((tf) => [tf, candleLimit]),
  );

  const symbolCountEstimate = 300;
  const symbolWorkload = symbolCountEstimate * deps.indicators.length * candleLimit;

  return {
    tree,
    isTickerOnly: walkTickerOnly(tree.root),
    primaryTimeframe: timeframes[0],
    candleLimit,
    candleWindowsByTimeframe,
    indicatorCount: deps.indicators.length,
    symbolWorkload,
    usesHistoryComparators: walkUsesHistory(tree.root),
  };
}
