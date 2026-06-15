import { ApiKeyStatus } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import {
  credentialAad,
  decryptSecret,
  encryptSecret,
  fingerprintApiKey,
} from "../security/encryption";
import { fetchPrivatePortfolioSnapshot, type PrivateBybitCredentials } from "./bybit-private-client";
import { redactCredentialError } from "../security/redaction";
import { clearCredentialPortfolioCache } from "../portfolio/portfolio-cache";

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

  await fetchPrivatePortfolioSnapshot({ apiKey, apiSecret });

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
