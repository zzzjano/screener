import { ApiKeyStatus, MarketType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  credentialAad,
  decryptSecret,
  encryptSecret,
  fingerprintApiKey,
} from "../security/encryption";
import {
  fetchPrivatePortfolioSnapshot,
  type NormalizedPortfolioSummary,
  type NormalizedPrivatePosition,
  type PrivateBybitCredentials,
} from "./bybit-private-client";
import { redactCredentialError } from "../security/redaction";
import { clearCredentialPortfolioCache, writePortfolioCache } from "../portfolio/portfolio-cache";

export interface CredentialMetadata {
  id: string;
  exchange: string;
  label: string | null;
  keyFingerprint: string;
  status: ApiKeyStatus;
  lastValidatedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

export async function createBybitCredential(input: {
  userId: string;
  apiKey: string;
  apiSecret: string;
  label?: string | null;
}): Promise<CredentialMetadata> {
  const apiKey = input.apiKey.trim();
  const apiSecret = input.apiSecret.trim();
  const keyFingerprint = fingerprintApiKey(apiKey);

  const snapshot = await fetchPrivatePortfolioSnapshot({ apiKey, apiSecret });

  const encryptedApiKey = encryptSecret(apiKey, credentialAad(input.userId, "bybit", "apiKey"));
  const encryptedApiSecret = encryptSecret(apiSecret, credentialAad(input.userId, "bybit", "apiSecret"));

  const credential = await prisma.userExchangeCredential.upsert({
    where: {
      userId_exchange_keyFingerprint: {
        userId: input.userId,
        exchange: "bybit",
        keyFingerprint,
      },
    },
    update: {
      label: input.label,
      apiKeyCiphertext: encryptedApiKey.ciphertext,
      apiKeyIv: encryptedApiKey.iv,
      apiKeyAuthTag: encryptedApiKey.authTag,
      apiSecretCiphertext: encryptedApiSecret.ciphertext,
      apiSecretIv: encryptedApiSecret.iv,
      apiSecretAuthTag: encryptedApiSecret.authTag,
      status: ApiKeyStatus.ACTIVE,
      lastValidatedAt: new Date(),
      lastError: null,
    },
    create: {
      userId: input.userId,
      exchange: "bybit",
      label: input.label,
      keyFingerprint,
      apiKeyCiphertext: encryptedApiKey.ciphertext,
      apiKeyIv: encryptedApiKey.iv,
      apiKeyAuthTag: encryptedApiKey.authTag,
      apiSecretCiphertext: encryptedApiSecret.ciphertext,
      apiSecretIv: encryptedApiSecret.iv,
      apiSecretAuthTag: encryptedApiSecret.authTag,
      status: ApiKeyStatus.ACTIVE,
      lastValidatedAt: new Date(),
    },
  });

  await writePortfolioCache({
    userId: input.userId,
    credentialId: credential.id,
    summary: snapshot.balance,
    positions: snapshot.positions,
  });
  await persistInitialPortfolioSnapshot(input.userId, credential.id, snapshot.balance);
  await persistInitialPositionSnapshots(input.userId, credential.id, snapshot.positions);

  return toMetadata(credential);
}

export async function getDecryptedBybitCredential(
  userId: string,
  credentialId: string,
): Promise<PrivateBybitCredentials> {
  const credential = await prisma.userExchangeCredential.findFirstOrThrow({
    where: { id: credentialId, userId, exchange: "bybit", status: ApiKeyStatus.ACTIVE },
  });

  return {
    apiKey: decryptSecret(
      {
        ciphertext: credential.apiKeyCiphertext,
        iv: credential.apiKeyIv,
        authTag: credential.apiKeyAuthTag,
      },
      credentialAad(userId, "bybit", "apiKey"),
    ),
    apiSecret: decryptSecret(
      {
        ciphertext: credential.apiSecretCiphertext,
        iv: credential.apiSecretIv,
        authTag: credential.apiSecretAuthTag,
      },
      credentialAad(userId, "bybit", "apiSecret"),
    ),
  };
}

export async function listCredentialMetadata(userId: string): Promise<CredentialMetadata[]> {
  const rows = await prisma.userExchangeCredential.findMany({
    where: { userId, exchange: "bybit" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toMetadata);
}

export async function getActiveBybitCredentialMetadata(userId: string): Promise<CredentialMetadata | null> {
  const credential = await prisma.userExchangeCredential.findFirst({
    where: { userId, exchange: "bybit", status: ApiKeyStatus.ACTIVE },
    orderBy: { updatedAt: "desc" },
  });
  return credential ? toMetadata(credential) : null;
}

export async function disableCredential(userId: string, credentialId: string): Promise<void> {
  await prisma.userExchangeCredential.updateMany({
    where: { id: credentialId, userId, exchange: "bybit" },
    data: { status: ApiKeyStatus.DISABLED },
  });
  await clearCredentialPortfolioCache(userId, credentialId);
}

export async function markCredentialError(
  credentialId: string,
  error: unknown,
): Promise<void> {
  await prisma.userExchangeCredential.update({
    where: { id: credentialId },
    data: {
      status: ApiKeyStatus.ERROR,
      lastError: redactCredentialError(error),
    },
  });
}

function toMetadata(row: {
  id: string;
  exchange: string;
  label: string | null;
  keyFingerprint: string;
  status: ApiKeyStatus;
  lastValidatedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}): CredentialMetadata {
  return {
    id: row.id,
    exchange: row.exchange,
    label: row.label,
    keyFingerprint: row.keyFingerprint.slice(0, 12),
    status: row.status,
    lastValidatedAt: row.lastValidatedAt,
    lastError: row.lastError,
    createdAt: row.createdAt,
  };
}

async function persistInitialPortfolioSnapshot(
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

async function persistInitialPositionSnapshots(
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
