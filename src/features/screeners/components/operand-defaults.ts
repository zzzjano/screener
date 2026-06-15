import type { IndicatorConfigAst, Operand } from "@/src/server/rules/ast";

export type UiOperandCategory = "market" | "indicator" | "derivative" | "sector" | "private" | "constant";
export type UiMarketField = "close" | "volume";
export type UiDerivativeField = "fundingRate" | "openInterest" | "liquidationNet";
export type UiPrivateField = "positionPnl" | "hasPosition" | "positionSide" | "totalEquity" | "marginUsage";
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

export function createDerivativeOperand(field: UiDerivativeField, timeframe: string): Operand {
  if (field === "fundingRate") return { kind: "FUNDING_RATE" };
  if (field === "openInterest") {
    return { kind: "OPEN_INTEREST", timeframe, transform: "PERCENT_CHANGE", lookbackBars: 1 };
  }
  return { kind: "LIQUIDATION", side: "NET", timeframe, transform: "SUM" };
}

export function createSectorOperand(tags: string[] = ["AI"]): Operand {
  return { kind: "SECTOR", tags, match: "IN" };
}

export function createPrivateOperand(field: UiPrivateField): Operand {
  if (field === "totalEquity") return { kind: "PORTFOLIO", field: "TOTAL_EQUITY" };
  if (field === "marginUsage") return { kind: "PORTFOLIO", field: "MARGIN_USAGE_PCT" };
  if (field === "hasPosition") {
    return { kind: "POSITION", field: "HAS_ACTIVE_POSITION", symbolScope: "CURRENT_SYMBOL" };
  }
  if (field === "positionSide") {
    return { kind: "POSITION", field: "SIDE", symbolScope: "CURRENT_SYMBOL" };
  }
  return { kind: "POSITION", field: "PNL_PCT", symbolScope: "CURRENT_SYMBOL" };
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
  if (
    operand.kind === "FUNDING_RATE" ||
    operand.kind === "OPEN_INTEREST" ||
    operand.kind === "LIQUIDATION"
  ) {
    return "derivative";
  }
  if (operand.kind === "SECTOR") return "sector";
  if (operand.kind === "PORTFOLIO" || operand.kind === "POSITION") return "private";
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

export function getDerivativeField(operand: Operand): UiDerivativeField {
  if (operand.kind === "FUNDING_RATE") return "fundingRate";
  if (operand.kind === "OPEN_INTEREST") return "openInterest";
  return "liquidationNet";
}

export function getPrivateField(operand: Operand): UiPrivateField {
  if (operand.kind === "PORTFOLIO") {
    return operand.field === "MARGIN_USAGE_PCT" ? "marginUsage" : "totalEquity";
  }
  if (operand.kind === "POSITION") {
    if (operand.field === "HAS_ACTIVE_POSITION") return "hasPosition";
    if (operand.field === "SIDE") return "positionSide";
  }
  return "positionPnl";
}

export function getOperandTimeframe(operand: Operand, fallback = "15m"): string {
  if (operand.kind === "CONSTANT") return fallback;
  if (operand.kind === "INDICATOR") return operand.indicator.timeframe;
  if (
    operand.kind === "FUNDING_RATE" ||
    operand.kind === "SECTOR" ||
    operand.kind === "PORTFOLIO" ||
    operand.kind === "POSITION"
  ) return fallback;
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
