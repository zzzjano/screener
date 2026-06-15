import { NextResponse } from "next/server";
import { getDemoUserId } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { fetchLinearTickerMap } from "@/src/server/market-data/ccxt-client";
import { getActiveBybitCredentialMetadata } from "@/src/server/exchanges/credential-service";
import { readPortfolioPositions, readPortfolioSummary } from "@/src/server/portfolio/portfolio-cache";

export async function GET() {
  const userId = await getDemoUserId();
  const credential = await getActiveBybitCredentialMetadata(userId);
  if (!credential) {
    return NextResponse.json({ summary: null, positions: [], stale: true });
  }

  const [cachedSummary, cachedPositions, tickers] = await Promise.all([
    readPortfolioSummary(userId, credential.id),
    readPortfolioPositions(userId, credential.id),
    fetchLinearTickerMap(),
  ]);

  const summary = cachedSummary ?? (await latestSummary(userId, credential.id));
  const positions = cachedPositions.length > 0 ? cachedPositions : await latestPositions(userId, credential.id);

  return NextResponse.json({
    summary,
    stale: cachedPositions.length === 0,
    positions: positions.map((position) => {
      const ticker = tickers.get(position.symbol);
      return {
        ...position,
        publicPrice: ticker?.price ?? null,
        change24hPct: ticker?.change24hPct ?? null,
        fundingRate: ticker?.fundingRate ?? null,
      };
    }),
  });
}

async function latestSummary(userId: string, credentialId: string) {
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
    createdAt: row.createdAt,
  };
}

async function latestPositions(userId: string, credentialId: string) {
  const rows = await prisma.positionSnapshot.findMany({
    where: { userId, credentialId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      if (seen.has(row.symbol)) return false;
      seen.add(row.symbol);
      return true;
    })
    .map((row) => ({
      symbol: row.symbol,
      side: row.side,
      contracts: row.contracts?.toNumber() ?? null,
      entryPrice: row.entryPrice?.toNumber() ?? null,
      markPrice: row.markPrice?.toNumber() ?? null,
      notional: row.notional?.toNumber() ?? null,
      leverage: row.leverage?.toNumber() ?? null,
      unrealizedPnl: row.unrealizedPnl?.toNumber() ?? null,
      pnlPct: row.pnlPct?.toNumber() ?? null,
      liquidationPrice: row.liquidationPrice?.toNumber() ?? null,
      marginMode: row.marginMode,
    }));
}
