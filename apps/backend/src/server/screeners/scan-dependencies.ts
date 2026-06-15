import { VALID_TIMEFRAMES, type Comparator, type IndicatorConfigAst, type Operand, type RuleNode, type RuleTree } from "../rules/ast";
import { getIndicatorWarmup } from "../indicators/indicator-registry";

export interface ScanDependencyGraph {
  timeframes: string[];
  candleWindowsByTimeframe: Record<string, number>;
  indicatorsByTimeframe: Record<string, IndicatorConfigAst[]>;
  maxWarmupBars: number;
}

const BASE_CANDLE_WINDOW = 3;
const HISTORY_CANDLE_WINDOW = 5;
const INDICATOR_BUFFER_BARS = 5;
const HISTORY_COMPARATORS = new Set<Comparator>([
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "PERCENT_CHANGE_GT",
  "PERCENT_CHANGE_LT",
  "VOLUME_SPIKE",
]);

function collectOperandTimeframes(
  operand: Operand,
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

function operandTimeframe(operand: Operand): string | null {
  if (operand.kind === "CONSTANT") return null;
  if (operand.kind === "INDICATOR") return operand.indicator.timeframe;
  if (
    operand.kind === "PRICE" ||
    operand.kind === "VOLUME" ||
    operand.kind === "MARKET_FIELD" ||
    operand.kind === "OPEN_INTEREST" ||
    operand.kind === "LIQUIDATION"
  ) {
    return operand.timeframe;
  }
  return null;
}

function bumpWindow(
  windows: Map<string, number>,
  timeframe: string | null,
  requiredBars: number,
): void {
  if (!timeframe) return;
  windows.set(timeframe, Math.max(windows.get(timeframe) ?? BASE_CANDLE_WINDOW, requiredBars));
}

function walkNode(
  node: RuleNode,
  timeframes: Set<string>,
  indicators: Map<string, IndicatorConfigAst>,
  candleWindows: Map<string, number>,
): void {
  if (node.type === "CONDITION") {
    collectOperandTimeframes(node.left, timeframes, indicators);
    collectOperandTimeframes(node.right, timeframes, indicators);
    const requiredBars = HISTORY_COMPARATORS.has(node.comparator)
      ? HISTORY_CANDLE_WINDOW
      : BASE_CANDLE_WINDOW;
    bumpWindow(candleWindows, operandTimeframe(node.left), requiredBars);
    bumpWindow(candleWindows, operandTimeframe(node.right), requiredBars);
    return;
  }
  for (const child of node.children) {
    walkNode(child, timeframes, indicators, candleWindows);
  }
}

export function buildScanDependencyGraph(tree: RuleTree): ScanDependencyGraph {
  const timeframes = new Set<string>();
  const indicators = new Map<string, IndicatorConfigAst>();
  const candleWindows = new Map<string, number>();
  walkNode(tree.root, timeframes, indicators, candleWindows);

  const indicatorList = Array.from(indicators.values());
  for (const indicator of indicatorList) {
    bumpWindow(
      candleWindows,
      indicator.timeframe,
      getIndicatorWarmup(indicator.kind, indicator.params) + INDICATOR_BUFFER_BARS,
    );
  }

  const candleWindowsByTimeframe: Record<string, number> = {};
  const indicatorsByTimeframe: Record<string, IndicatorConfigAst[]> = {};

  for (const tf of timeframes) {
    candleWindowsByTimeframe[tf] = candleWindows.get(tf) ?? BASE_CANDLE_WINDOW;
    indicatorsByTimeframe[tf] = indicatorList.filter((ind) => ind.timeframe === tf);
  }

  if (timeframes.size === 0) {
    candleWindowsByTimeframe["15m"] = BASE_CANDLE_WINDOW;
    indicatorsByTimeframe["15m"] = [];
  }

  const maxWarmupBars = Math.max(...Object.values(candleWindowsByTimeframe));

  return {
    timeframes: Array.from(timeframes.size > 0 ? timeframes : ["15m"]),
    candleWindowsByTimeframe,
    indicatorsByTimeframe,
    maxWarmupBars,
  };
}
