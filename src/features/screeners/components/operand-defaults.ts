import type { IndicatorConfigAst, Operand } from "@/src/server/rules/ast";

export type UiOperandCategory = "market" | "indicator" | "constant";
export type UiMarketField = "close" | "volume";
export type UiIndicatorKind = "RSI" | "EMA" | "SMA" | "MACD";

export const UI_COMPARATORS = [
  "LT",
  "LTE",
  "GT",
  "GTE",
  "EQ",
  "NEQ",
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
] as const;

export function newIndicatorId(): string {
  return `ind-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultIndicatorParams(kind: UiIndicatorKind): Record<string, number> {
  switch (kind) {
    case "RSI":
      return { period: 14 };
    case "EMA":
      return { period: 50 };
    case "SMA":
      return { period: 50 };
    case "MACD":
      return { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
  }
}

export function createMarketOperand(field: UiMarketField, timeframe: string): Operand {
  if (field === "volume") {
    return { kind: "VOLUME", timeframe };
  }
  return { kind: "PRICE", source: "CLOSE", timeframe };
}

export function createIndicatorOperand(
  kind: UiIndicatorKind,
  timeframe: string,
  indicatorId?: string,
): Operand {
  return {
    kind: "INDICATOR",
    indicator: {
      id: indicatorId ?? newIndicatorId(),
      kind,
      timeframe,
      source: "CLOSE",
      params: defaultIndicatorParams(kind),
    },
  };
}

export function createConstantOperand(value = 0): Operand {
  return { kind: "CONSTANT", value };
}

export function getOperandCategory(operand: Operand): UiOperandCategory {
  if (operand.kind === "CONSTANT") return "constant";
  if (operand.kind === "INDICATOR") return "indicator";
  return "market";
}

export function getMarketField(operand: Operand): UiMarketField {
  if (operand.kind === "VOLUME") return "volume";
  return "close";
}

export function getIndicatorKind(operand: Operand): UiIndicatorKind {
  if (operand.kind === "INDICATOR") {
    return operand.indicator.kind as UiIndicatorKind;
  }
  return "RSI";
}

export function getOperandTimeframe(operand: Operand, fallback = "15m"): string {
  if (operand.kind === "CONSTANT") return fallback;
  if (operand.kind === "INDICATOR") return operand.indicator.timeframe;
  return operand.timeframe;
}

export function updateIndicatorParams(
  indicator: IndicatorConfigAst,
  patch: Record<string, number>,
): IndicatorConfigAst {
  return {
    ...indicator,
    params: { ...indicator.params, ...patch },
  };
}
