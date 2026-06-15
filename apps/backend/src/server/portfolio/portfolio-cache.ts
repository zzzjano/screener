import { getRedis } from "../../lib/redis";
import type { NormalizedPortfolioSummary, NormalizedPrivatePosition } from "../exchanges/bybit-private-client";

const PORTFOLIO_TTL_SECONDS = 90;

export function portfolioSummaryKey(userId: string, credentialId: string): string {
  return `portfolio:summary:${userId}:${credentialId}`;
}

export function portfolioPositionsKey(userId: string, credentialId: string): string {
  return `portfolio:positions:${userId}:${credentialId}`;
}

export function portfolioPositionKey(userId: string, symbol: string): string {
  return `portfolio:position:${userId}:${symbol}`;
}

export async function writePortfolioCache(input: {
  userId: string;
  credentialId: string;
  summary: NormalizedPortfolioSummary;
  positions: NormalizedPrivatePosition[];
}): Promise<void> {
  const redis = getRedis();
  const multi = redis.multi();
  multi.setex(portfolioSummaryKey(input.userId, input.credentialId), PORTFOLIO_TTL_SECONDS, JSON.stringify(input.summary));
  multi.setex(portfolioPositionsKey(input.userId, input.credentialId), PORTFOLIO_TTL_SECONDS, JSON.stringify(input.positions));
  for (const position of input.positions) {
    multi.setex(portfolioPositionKey(input.userId, position.symbol), PORTFOLIO_TTL_SECONDS, JSON.stringify(position));
  }
  await multi.exec();
}

export async function readPortfolioPositions(
  userId: string,
  credentialId: string,
): Promise<NormalizedPrivatePosition[]> {
  const raw = await getRedis().get(portfolioPositionsKey(userId, credentialId));
  return raw ? (JSON.parse(raw) as NormalizedPrivatePosition[]) : [];
}

export async function readPortfolioSummary(
  userId: string,
  credentialId: string,
): Promise<NormalizedPortfolioSummary | null> {
  const raw = await getRedis().get(portfolioSummaryKey(userId, credentialId));
  return raw ? (JSON.parse(raw) as NormalizedPortfolioSummary) : null;
}

export async function readPositionForSymbol(
  userId: string,
  symbol: string,
): Promise<NormalizedPrivatePosition | null> {
  const raw = await getRedis().get(portfolioPositionKey(userId, symbol));
  return raw ? (JSON.parse(raw) as NormalizedPrivatePosition) : null;
}

export async function clearCredentialPortfolioCache(userId: string, credentialId: string): Promise<void> {
  await getRedis().del(portfolioSummaryKey(userId, credentialId), portfolioPositionsKey(userId, credentialId));
}
