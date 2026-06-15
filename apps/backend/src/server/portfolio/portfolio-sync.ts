import { MarketType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getRedis } from "../../lib/redis";
import { getDecryptedBybitCredential, markCredentialError } from "../exchanges/credential-service";
import { fetchPrivatePortfolioSnapshot } from "../exchanges/bybit-private-client";
import { writePortfolioCache } from "./portfolio-cache";
import type { NormalizedPrivatePosition, NormalizedPortfolioSummary } from "../exchanges/bybit-private-client";

const LOCK_TTL_SECONDS = 45;

export async function syncPortfolioCredential(input: {
  userId: string;
  credentialId: string;
}): Promise<{ positions: number; skipped?: boolean }> {
  const redis = getRedis();
  const lockKey = `lock:portfolio-sync:${input.credentialId}`;
  const locked = await redis.set(lockKey, "1", "EX", LOCK_TTL_SECONDS, "NX");
  if (locked !== "OK") return { positions: 0, skipped: true };

  try {
    const credentials = await getDecryptedBybitCredential(input.userId, input.credentialId);
    const snapshot = await fetchPrivatePortfolioSnapshot(credentials);
    await writePortfolioCache({
      userId: input.userId,
      credentialId: input.credentialId,
      summary: snapshot.balance,
      positions: snapshot.positions,
    });
    await persistPortfolioSnapshot(input.userId, input.credentialId, snapshot.balance);
    await persistPositionSnapshots(input.userId, input.credentialId, snapshot.positions);
    await prisma.userExchangeCredential.update({
      where: { id: input.credentialId },
      data: { lastValidatedAt: new Date(), lastError: null },
    });
    return { positions: snapshot.positions.length };
  } catch (error) {
    await markCredentialError(input.credentialId, error);
    throw error;
  } finally {
    await redis.del(lockKey);
  }
}

async function persistPortfolioSnapshot(
  userId: string,
  credentialId: string,
  summary: NormalizedPortfolioSummary,
): Promise<void> {
  await prisma.portfolioSnapshot.create({
    data: {
      userId,
      credentialId,
      exchange: "bybit",
      accountType: summary.accountType,
      totalEquity: decimalOrNull(summary.totalEquity),
      availableBalance: decimalOrNull(summary.availableBalance),
      maintenanceMargin: decimalOrNull(summary.maintenanceMargin),
      initialMargin: decimalOrNull(summary.initialMargin),
      raw: summary.raw as Prisma.InputJsonValue,
    },
  });
}

async function persistPositionSnapshots(
  userId: string,
  credentialId: string,
  positions: NormalizedPrivatePosition[],
): Promise<void> {
  if (positions.length === 0) return;
  await prisma.positionSnapshot.createMany({
    data: positions.map((position) => ({
      userId,
      credentialId,
      exchange: "bybit",
      marketType: MarketType.LINEAR,
      symbol: position.symbol,
      side: position.side,
      contracts: decimalOrNull(position.contracts),
      entryPrice: decimalOrNull(position.entryPrice),
      markPrice: decimalOrNull(position.markPrice),
      notional: decimalOrNull(position.notional),
      leverage: decimalOrNull(position.leverage),
      unrealizedPnl: decimalOrNull(position.unrealizedPnl),
      pnlPct: decimalOrNull(position.pnlPct),
      liquidationPrice: decimalOrNull(position.liquidationPrice),
      marginMode: position.marginMode,
      raw: position.raw as Prisma.InputJsonValue,
    })),
  });
}

function decimalOrNull(value: number | null | undefined): Prisma.Decimal | null {
  return value === null || value === undefined || !Number.isFinite(value)
    ? null
    : new Prisma.Decimal(value);
}
