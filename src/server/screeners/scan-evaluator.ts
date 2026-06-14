import type { ConditionNode, Operand, RuleNode, RuleTree } from "../rules/ast";
import { compareValues } from "../rules/operators";
import type { RuleEvaluationResult, RuleEvaluationSnapshot } from "../rules/evaluator";
import { getPriceFromCandles } from "../indicators/indicator-types";
import type { Candle } from "../indicators/indicator-types";
import type { IndicatorExecutionEngine } from "../indicators/indicator-execution-engine";
import { getConditionDataCost, sortChildrenByCost } from "./scan-planner";

export interface TickerSnapshot {
  price: number;
  volume24h: number;
}

export interface ScanEvalContext {
  symbol: string;
  marketType: string;
  ticker?: TickerSnapshot;
  candlesByTf: Map<string, Candle[]>;
  loadCandles: (timeframe: string) => Promise<Candle[]>;
  indicatorEngine: IndicatorExecutionEngine;
}

async function resolveOperand(operand: Operand, ctx: ScanEvalContext) {
  switch (operand.kind) {
    case "CONSTANT":
      return { current: operand.value };
    case "PRICE": {
      if (operand.source === "CLOSE" && ctx.ticker) {
        return { current: ctx.ticker.price };
      }
      const candles = await ctx.loadCandles(operand.timeframe);
      return getPriceFromCandles(candles, operand.source);
    }
    case "VOLUME": {
      if (ctx.ticker) {
        return { current: ctx.ticker.volume24h };
      }
      const candles = await ctx.loadCandles(operand.timeframe);
      if (candles.length === 0) return { current: NaN };
      const last = candles[candles.length - 1];
      const prev = candles.length > 1 ? candles[candles.length - 2] : undefined;
      return { current: last.v, previous: prev?.v };
    }
    case "MARKET_FIELD": {
      const candles = await ctx.loadCandles(operand.timeframe);
      if (candles.length === 0) return { current: NaN };
      const last = candles[candles.length - 1];
      const value = (last as unknown as Record<string, number>)[operand.field] ?? NaN;
      return { current: value };
    }
    case "INDICATOR": {
      const candles = await ctx.loadCandles(operand.indicator.timeframe);
      return ctx.indicatorEngine.getIndicator(candles, operand.indicator);
    }
    default:
      return { current: NaN };
  }
}

async function evaluateCondition(
  node: ConditionNode,
  ctx: ScanEvalContext,
): Promise<RuleEvaluationSnapshot> {
  const left = await resolveOperand(node.left, ctx);
  const right = await resolveOperand(node.right, ctx);
  const passed = compareValues(node.comparator, left, right, node.params);

  return {
    nodeId: node.id,
    passed,
    explanationPl: `Warunek ${passed ? "spełniony" : "niespełniony"}: ${left.current} vs ${right.current}`,
    leftValue: left.current,
    rightValue: right.current,
  };
}

async function evaluateNode(node: RuleNode, ctx: ScanEvalContext): Promise<RuleEvaluationResult> {
  if (node.type === "CONDITION") {
    const snapshot = await evaluateCondition(node, ctx);
    return { passed: snapshot.passed, snapshots: [snapshot] };
  }

  const children = sortChildrenByCost(node.children);

  if (node.operator === "AND") {
    const snapshots: RuleEvaluationSnapshot[] = [];
    for (const child of children) {
      const result = await evaluateNode(child, ctx);
      snapshots.push(...result.snapshots);
      if (!result.passed) {
        return { passed: false, snapshots };
      }
    }
    return { passed: true, snapshots };
  }

  const snapshots: RuleEvaluationSnapshot[] = [];
  for (const child of children) {
    const result = await evaluateNode(child, ctx);
    snapshots.push(...result.snapshots);
    if (result.passed) {
      return { passed: true, snapshots };
    }
  }
  return { passed: false, snapshots };
}

export async function evaluateRuleTreeForScan(
  tree: RuleTree,
  ctx: ScanEvalContext,
): Promise<RuleEvaluationResult> {
  return evaluateNode(tree.root, ctx);
}

export function canShortCircuitBeforeCandles(node: RuleNode): boolean {
  if (node.type === "CONDITION") {
    return getConditionDataCost(node) === "ticker";
  }
  return node.children.every(canShortCircuitBeforeCandles);
}

export async function evaluateTickerPhase(
  tree: RuleTree,
  ctx: ScanEvalContext,
): Promise<RuleEvaluationResult | null> {
  if (!canShortCircuitBeforeCandles(tree.root)) {
    return null;
  }
  return evaluateRuleTreeForScan(tree, ctx);
}
