import type { ConditionNode, Operand, RuleNode, RuleTree } from "../rules/ast";
import { compareValues } from "../rules/operators";
import type { RuleEvaluationResult, RuleEvaluationSnapshot } from "../rules/evaluator";
import { getPriceFromCandles } from "../indicators/indicator-types";
import type { Candle } from "../indicators/indicator-types";
import type { IndicatorExecutionEngine } from "../indicators/indicator-execution-engine";
import type { LinearTickerSnapshot } from "../market-data/ccxt-client";
import { getConditionDataCost, sortChildrenByCost } from "./scan-planner";

export interface ScanEvalContext {
  symbol: string;
  marketType: string;
  ticker?: LinearTickerSnapshot;
  isTickerOnlyScan: boolean;
  candlesByTf: Map<string, Candle[]>;
  loadCandles: (timeframe: string) => Promise<Candle[]>;
  getDerivativeMetric?: (operand: Extract<Operand, { kind: "OPEN_INTEREST" | "FUNDING_RATE" | "LIQUIDATION" }>) => Promise<{ current: number; previous?: number }>;
  getSectorTags?: () => Promise<string[]>;
  getPortfolioMetric?: (operand: Extract<Operand, { kind: "PORTFOLIO" }>) => Promise<{ current: number; previous?: number }>;
  getPositionMetric?: (symbol: string, operand: Extract<Operand, { kind: "POSITION" }>) => Promise<{ current: number; previous?: number }>;
  indicatorEngine: IndicatorExecutionEngine;
}

async function resolveOperand(operand: Operand, ctx: ScanEvalContext) {
  switch (operand.kind) {
    case "CONSTANT":
      return { current: operand.value };
    case "PRICE": {
      if (ctx.isTickerOnlyScan && operand.source === "CLOSE" && ctx.ticker) {
        return { current: ctx.ticker.price };
      }
      const candles = await ctx.loadCandles(operand.timeframe);
      return getPriceFromCandles(candles, operand.source);
    }
    case "VOLUME": {
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
    case "FUNDING_RATE": {
      if (ctx.ticker?.fundingRate !== null && ctx.ticker?.fundingRate !== undefined) {
        return { current: ctx.ticker.fundingRate };
      }
      return ctx.getDerivativeMetric?.(operand) ?? { current: NaN };
    }
    case "OPEN_INTEREST":
    case "LIQUIDATION":
      return ctx.getDerivativeMetric?.(operand) ?? { current: NaN };
    case "SECTOR": {
      const tags = await ctx.getSectorTags?.() ?? [];
      const normalized = new Set(tags.map((tag) => tag.toLowerCase()));
      const hasMatch = operand.tags.some((tag) => normalized.has(tag.toLowerCase()));
      const passed = operand.match === "IN" ? hasMatch : !hasMatch;
      return { current: passed ? 1 : 0 };
    }
    case "PORTFOLIO":
      return ctx.getPortfolioMetric?.(operand) ?? { current: NaN };
    case "POSITION":
      return ctx.getPositionMetric?.(ctx.symbol, operand) ?? { current: NaN };
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
