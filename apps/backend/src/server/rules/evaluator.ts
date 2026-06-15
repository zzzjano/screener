import type { ConditionNode, Operand, RuleNode, RuleTree } from "./ast";
import { compareValues } from "./operators";
import type { EvaluationContext } from "../indicators/indicator-types";

export interface RuleEvaluationSnapshot {
  nodeId: string;
  passed: boolean;
  explanationPl: string;
  leftValue?: number;
  rightValue?: number;
  value?: number;
}

export interface RuleEvaluationResult {
  passed: boolean;
  snapshots: RuleEvaluationSnapshot[];
}

function resolveOperand(
  operand: Operand,
  ctx: EvaluationContext,
): { current: number; previous?: number } {
  switch (operand.kind) {
    case "CONSTANT":
      return { current: operand.value };
    case "PRICE":
      return ctx.getPrice(operand.timeframe, operand.source);
    case "VOLUME":
      return ctx.getVolume(operand.timeframe);
    case "MARKET_FIELD":
      return ctx.getMarketField(operand.timeframe, operand.field);
    case "INDICATOR":
      return ctx.getIndicator(operand.indicator);
    default:
      return { current: NaN };
  }
}

function evaluateCondition(
  node: ConditionNode,
  ctx: EvaluationContext,
): RuleEvaluationSnapshot {
  const left = resolveOperand(node.left, ctx);
  const right = resolveOperand(node.right, ctx);
  const passed = compareValues(node.comparator, left, right, node.params);

  return {
    nodeId: node.id,
    passed,
    explanationPl: `Warunek ${passed ? "spełniony" : "niespełniony"}: ${left.current} vs ${right.current}`,
    leftValue: left.current,
    rightValue: right.current,
    value: left.current,
  };
}

function evaluateNode(node: RuleNode, ctx: EvaluationContext): RuleEvaluationResult {
  if (node.type === "CONDITION") {
    const snapshot = evaluateCondition(node, ctx);
    return { passed: snapshot.passed, snapshots: [snapshot] };
  }

  const childResults = node.children.map((child) => evaluateNode(child, ctx));
  const snapshots = childResults.flatMap((r) => r.snapshots);
  let passed =
    node.operator === "AND"
      ? childResults.every((r) => r.passed)
      : childResults.some((r) => r.passed);

  if (node.negate) passed = !passed;

  return { passed, snapshots };
}

export function evaluateRuleTree(tree: RuleTree, ctx: EvaluationContext): RuleEvaluationResult {
  return evaluateNode(tree.root, ctx);
}
