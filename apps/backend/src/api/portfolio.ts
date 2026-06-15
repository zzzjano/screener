import { FastifyPluginAsync } from 'fastify';
import { getDemoUserId } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { fetchLinearTickerMap } from '../server/market-data/ccxt-client';
import { getActiveBybitCredentialMetadata } from '../server/exchanges/credential-service';
import { readPortfolioPositions, readPortfolioSummary } from '../server/portfolio/portfolio-cache';
import { syncPortfolioCredential } from '../server/portfolio/portfolio-sync';

const portfolioRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/positions', async (request, reply) => {
    const userId = await getDemoUserId();
    const credential = await getActiveBybitCredentialMetadata(userId);
    if (!credential) {
      return reply.send({ summary: null, positions: [], stale: true });
    }

    const [cachedSummary, cachedPositions, tickers] = await Promise.all([
      readPortfolioSummary(userId, credential.id),
      readPortfolioPositions(userId, credential.id),
      fetchLinearTickerMap(),
    ]);

    const summary = cachedSummary ?? (await latestSummary(userId, credential.id));
    const positions = cachedPositions.length > 0 ? cachedPositions : await latestPositions(userId, credential.id);

    return reply.send({
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
  });

  fastify.post('/sync', async (request, reply) => {
    const userId = await getDemoUserId();
    const credential = await getActiveBybitCredentialMetadata(userId);
    if (!credential) {
      return reply.status(404).send({ error: "Brak aktywnego klucza Bybit" });
    }
    const result = await syncPortfolioCredential({ userId, credentialId: credential.id });
    return reply.send({ synced: true, ...result });
  });
};

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

export default portfolioRoutes;
