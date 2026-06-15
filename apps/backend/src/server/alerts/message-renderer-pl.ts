import { pl } from "@/src/lib/i18n/pl";
import { formatWarsawDate } from "@/src/lib/dates";
import type { RuleEvaluationSnapshot } from "../rules/evaluator";
import type { Candle } from "../indicators/indicator-types";
import type { MatchedConditionBadge } from "../screeners/match-format";

export interface AlertMessageInput {
  screenerName: string;
  symbol: string;
  timeframe: string;
  candle: Candle;
  snapshots: RuleEvaluationSnapshot[];
  price?: number | null;
  change24hPct?: number | null;
  fundingRate?: number | null;
  matchedConditions?: MatchedConditionBadge[];
  positionContext?: AlertPositionContext | null;
}

export interface AlertPositionContext {
  side: string;
  entryPrice?: number | null;
  markPrice?: number | null;
  unrealizedPnl?: number | null;
  pnlPct?: number | null;
  liquidationPrice?: number | null;
}

export function renderAlertMessagePl(input: AlertMessageInput, template?: string | null): string {
  const matchedConditions =
    input.matchedConditions && input.matchedConditions.length > 0
      ? input.matchedConditions
      : input.snapshots
          .filter((s) => s.passed)
          .map((s) => ({
            nodeId: s.nodeId,
            label: s.explanationPl,
            leftValue: s.leftValue,
            rightValue: s.rightValue,
          }));
  const matchedSummary = matchedConditions.map((condition) => condition.label).join("; ");
  const conditionLines = matchedConditions.length
    ? matchedConditions.map((condition) => `✅ ${escapeHtml(condition.label)}`).join("\n")
    : "✅ Spełnione";
  const price = input.price ?? input.candle.c;
  const positionLines = input.positionContext
    ? [
        `Pozycja: <b>${escapeHtml(input.positionContext.side)}</b>`,
        `Entry: ${formatNumber(input.positionContext.entryPrice)} | Mark: ${formatNumber(input.positionContext.markPrice)}`,
        `PnL: ${formatSignedPercent(input.positionContext.pnlPct)} (${formatNumber(input.positionContext.unrealizedPnl)})`,
        `Liq: ${formatNumber(input.positionContext.liquidationPrice)}`,
      ].join("\n")
    : null;

  const defaults = [
    `<b>${escapeHtml(pl.telegram.signalTitle)}: ${escapeHtml(input.screenerName)}</b>`,
    `${escapeHtml(pl.telegram.market)}: <code>${escapeHtml(input.symbol)}</code> (${escapeHtml(input.timeframe)})`,
    `${escapeHtml(pl.telegram.currentPrice)}: <b>${formatNumber(price)}</b>`,
    `${escapeHtml(pl.telegram.change24h)}: ${formatSignedPercent(input.change24hPct)}`,
    `${escapeHtml(pl.telegram.funding)}: ${formatFunding(input.fundingRate)}`,
    positionLines,
    `${escapeHtml(pl.telegram.conditions)}:\n${conditionLines}`,
    `${pl.telegram.candleTime}: ${formatWarsawDate(new Date(input.candle.T))}`,
  ].filter(Boolean).join("\n");

  if (!template) return defaults;

  return template
    .replace("{screenerName}", input.screenerName)
    .replace("{symbol}", input.symbol)
    .replace("{timeframe}", input.timeframe)
    .replace("{close}", String(input.candle.c))
    .replace("{price}", String(price))
    .replace("{change24hPct}", input.change24hPct === null || input.change24hPct === undefined ? "" : String(input.change24hPct))
    .replace("{fundingRate}", input.fundingRate === null || input.fundingRate === undefined ? "" : String(input.fundingRate))
    .replace("{matchedConditionsSummary}", matchedSummary)
    .replace("{candleCloseTimeEuropeWarsaw}", formatWarsawDate(new Date(input.candle.T)));
}

export function bybitTradeUrl(symbol: string): string {
  const slug = symbol.split(":")[0].replace("/", "").toUpperCase();
  return `https://www.bybit.com/trade/usdt/${slug}`;
}

export function bybitTradeButtonText(symbol: string): string {
  const slug = symbol.split(":")[0].replace("/", "").toUpperCase();
  return `📈 Trade ${slug} on Bybit`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(value);
}

function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatFunding(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(4)}%`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
