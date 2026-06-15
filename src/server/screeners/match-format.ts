import type { ConditionNode, Operand, RuleNode, RuleTree } from "../rules/ast";
import type { RuleEvaluationSnapshot } from "../rules/evaluator";

export interface MatchedConditionBadge {
  nodeId: string;
  label: string;
  leftValue?: number;
  rightValue?: number;
}

export function formatMatchedConditions(
  tree: RuleTree,
  snapshots: RuleEvaluationSnapshot[],
): MatchedConditionBadge[] {
  const conditions = new Map<string, ConditionNode>();
  collectConditions(tree.root, conditions);

  return snapshots
    .filter((snapshot) => snapshot.passed)
    .map((snapshot) => {
      const condition = conditions.get(snapshot.nodeId);
      return {
        nodeId: snapshot.nodeId,
        label: condition ? formatConditionLabel(condition, snapshot) : snapshot.explanationPl,
        leftValue: snapshot.leftValue,
        rightValue: snapshot.rightValue,
      };
    });
}

export function formatConditionLabel(
  condition: ConditionNode,
  snapshot: RuleEvaluationSnapshot,
): string {
  const leftLabel = formatOperandLabel(condition.left);
  const rightLabel = formatOperandLabel(condition.right);
  const comparator = formatComparator(condition.comparator);

  if (condition.left.kind === "INDICATOR" && condition.right.kind === "CONSTANT") {
    return `${leftLabel}: ${formatBadgeNumber(snapshot.leftValue)} ${comparator} ${formatBadgeNumber(snapshot.rightValue)}`;
  }

  if (condition.left.kind === "PRICE" && condition.right.kind === "INDICATOR") {
    return `${leftLabel} ${comparator} ${rightLabel}`;
  }

  if (condition.left.kind === "INDICATOR" && condition.right.kind === "INDICATOR") {
    return `${leftLabel} ${comparator} ${rightLabel}`;
  }

  return `${leftLabel} ${comparator} ${rightLabel}`;
}

function collectConditions(node: RuleNode, conditions: Map<string, ConditionNode>): void {
  if (node.type === "CONDITION") {
    conditions.set(node.id, node);
    return;
  }

  for (const child of node.children) {
    collectConditions(child, conditions);
  }
}

function formatOperandLabel(operand: Operand): string {
  switch (operand.kind) {
    case "CONSTANT":
      return formatBadgeNumber(operand.value);
    case "PRICE":
      return operand.source === "CLOSE" ? `Price (${operand.timeframe})` : `${operand.source} (${operand.timeframe})`;
    case "VOLUME":
      return `Vol (${operand.timeframe})`;
    case "MARKET_FIELD":
      return `${operand.field} (${operand.timeframe})`;
    case "FUNDING_RATE":
      return "Funding";
    case "OPEN_INTEREST":
      return operand.transform === "PERCENT_CHANGE"
        ? `OI % (${operand.timeframe})`
        : `OI (${operand.timeframe})`;
    case "LIQUIDATION":
      return `Liq ${operand.side} (${operand.timeframe})`;
    case "SECTOR":
      return `Sector ${operand.match} ${operand.tags.join(",")}`;
    case "PORTFOLIO":
      return `Portfolio ${operand.field}`;
    case "POSITION":
      return `Position ${operand.field}`;
    case "INDICATOR": {
      const period = operand.indicator.params.period;
      const suffix = typeof period === "number" ? ` ${period}` : "";
      return `${operand.indicator.kind}${suffix} (${operand.indicator.timeframe})`;
    }
  }
}

function formatComparator(comparator: ConditionNode["comparator"]): string {
  switch (comparator) {
    case "GT":
      return ">";
    case "GTE":
      return ">=";
    case "LT":
      return "<";
    case "LTE":
      return "<=";
    case "EQ":
      return "=";
    case "NEQ":
      return "!=";
    case "CROSSES_ABOVE":
      return "cross >";
    case "CROSSES_BELOW":
      return "cross <";
    default:
      return comparator;
  }
}

function formatBadgeNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "n/a";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 4,
  }).format(value);
}
