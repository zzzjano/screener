import { prisma } from "../../lib/prisma";
import type { Operand } from "../rules/ast";
import {
  readPortfolioSummary,
  readPositionForSymbol,
} from "./portfolio-cache";

type PortfolioOperand = Extract<Operand, { kind: "PORTFOLIO" }>;
type PositionOperand = Extract<Operand, { kind: "POSITION" }>;

export async function resolvePortfolioMetric(input: {
  userId: string;
  credentialId: string;
  operand: PortfolioOperand;
}): Promise<{ current: number }> {
  const summary =
    (await readPortfolioSummary(input.userId, input.credentialId)) ??
    (await readLatestPortfolioSummary(input.userId, input.credentialId));

  if (!summary) return { current: NaN };
  if (input.operand.field === "TOTAL_EQUITY") return { current: summary.totalEquity ?? NaN };
  if (input.operand.field === "AVAILABLE_BALANCE") return { current: summary.availableBalance ?? NaN };

  const initial = summary.initialMargin ?? 0;
  const equity = summary.totalEquity ?? 0;
  return { current: equity > 0 ? (initial / equity) * 100 : NaN };
}

export async function resolvePositionMetric(input: {
  userId: string;
  symbol: string;
  operand: PositionOperand;
}): Promise<{ current: number }> {
  const position =
    (await readPositionForSymbol(input.userId, input.symbol)) ??
    (await readLatestPosition(input.userId, input.symbol));

  if (input.operand.field === "HAS_ACTIVE_POSITION") {
    return { current: position && (position.contracts ?? 0) !== 0 ? 1 : 0 };
  }
  if (!position) return { current: NaN };
  if (input.operand.side && position.side !== input.operand.side) return { current: NaN };

  switch (input.operand.field) {
    case "PNL_PCT":
      return { current: position.pnlPct ?? NaN };
    case "SIDE":
      return { current: position.side === "LONG" ? 1 : position.side === "SHORT" ? -1 : 0 };
    case "LEVERAGE":
      return { current: position.leverage ?? NaN };
    case "NOTIONAL":
      return { current: position.notional ?? NaN };
    default:
      return { current: NaN };
  }
}

async function readLatestPortfolioSummary(userId: string, credentialId: string) {
  const row = await prisma.portfolioSnapshot.findFirst({
    where: { userId, credentialId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return {
    accountType: row.accountType,
    totalEquity: row.totalEquity?.toNumber() ?? null,
    availableBalance: row.availableBalance?.toNumber() ?? null,
    maintenanceMargin: row.maintenanceMargin?.toNumber() ?? null,
    initialMargin: row.initialMargin?.toNumber() ?? null,
    raw: row.raw,
  };
}

async function readLatestPosition(userId: string, symbol: string) {
  const row = await prisma.positionSnapshot.findFirst({
    where: { userId, symbol },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return {
    symbol: row.symbol,
    side: row.side as "LONG" | "SHORT" | "NONE",
    contracts: row.contracts?.toNumber() ?? null,
    entryPrice: row.entryPrice?.toNumber() ?? null,
    markPrice: row.markPrice?.toNumber() ?? null,
    notional: row.notional?.toNumber() ?? null,
    leverage: row.leverage?.toNumber() ?? null,
    unrealizedPnl: row.unrealizedPnl?.toNumber() ?? null,
    pnlPct: row.pnlPct?.toNumber() ?? null,
    liquidationPrice: row.liquidationPrice?.toNumber() ?? null,
    marginMode: row.marginMode,
    raw: row.raw,
  };
}
