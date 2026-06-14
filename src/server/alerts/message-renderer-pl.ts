import { pl } from "@/src/lib/i18n/pl";
import { formatWarsawDate } from "@/src/lib/dates";
import type { RuleEvaluationSnapshot } from "../rules/evaluator";
import type { Candle } from "../indicators/indicator-types";

export interface AlertMessageInput {
  screenerName: string;
  symbol: string;
  timeframe: string;
  candle: Candle;
  snapshots: RuleEvaluationSnapshot[];
}

export function renderAlertMessagePl(input: AlertMessageInput, template?: string | null): string {
  const matchedSummary = input.snapshots
    .filter((s) => s.passed)
    .map((s) => s.explanationPl)
    .join("; ");

  const defaults = [
    `<b>${pl.telegram.signalTitle}: ${input.screenerName}</b>`,
    `${pl.telegram.market}: ${input.symbol} (${input.timeframe})`,
    `${pl.telegram.closePrice}: ${input.candle.c}`,
    `${pl.telegram.conditions}: ${matchedSummary || "Spełnione"}`,
    `${pl.telegram.candleTime}: ${formatWarsawDate(new Date(input.candle.T))}`,
  ].join("\n");

  if (!template) return defaults;

  return template
    .replace("{screenerName}", input.screenerName)
    .replace("{symbol}", input.symbol)
    .replace("{timeframe}", input.timeframe)
    .replace("{close}", String(input.candle.c))
    .replace("{matchedConditionsSummary}", matchedSummary)
    .replace("{candleCloseTimeEuropeWarsaw}", formatWarsawDate(new Date(input.candle.T)));
}
