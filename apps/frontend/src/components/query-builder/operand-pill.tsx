import type { Operand } from "@screener/shared-types";

export function OperandPill({ operand }: { operand: Operand }) {
  const label = formatOperand(operand);
  return (
    <span
      className="inline-block min-w-0 max-w-[9rem] truncate border border-[#2b3139] bg-[#161b22] px-1.5 py-0.5 font-mono text-[11px] text-[#eaecef]"
      title={label}
    >
      {label}
    </span>
  );
}

export function formatOperand(operand: Operand): string {
  switch (operand.kind) {
    case "CONSTANT":
      return String(operand.value);
    case "PRICE":
      return `${operand.source} · ${operand.timeframe}`;
    case "VOLUME":
      return `VOL · ${operand.timeframe}`;
    case "TICKER_VOLUME":
      return "Vol 24h";
    case "MARKET_FIELD":
      return `${operand.field} · ${operand.timeframe}`;
    case "INDICATOR":
      return `${operand.indicator.kind}${periodSuffix(operand.indicator.params.period)} · ${operand.indicator.timeframe}`;
    case "FUNDING_RATE":
      return "Funding";
    case "OPEN_INTEREST":
      return `OI · ${operand.timeframe}`;
    case "LIQUIDATION":
      return `Liq ${operand.side} · ${operand.timeframe}`;
    case "SECTOR":
      return `Sector ${operand.match} ${operand.tags.join(",")}`;
    case "PORTFOLIO":
      return `Portfolio ${operand.field}`;
    case "POSITION":
      return `Position ${operand.field}`;
  }
}

function periodSuffix(value: unknown): string {
  return typeof value === "number" ? ` ${value}` : "";
}
