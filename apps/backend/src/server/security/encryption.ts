import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "@/src/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptSecret(plaintext: string, aad = ""): EncryptedSecret {
  const key = getCredentialKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES });
  if (aad) cipher.setAAD(Buffer.from(aad, "utf8"));

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(secret: EncryptedSecret, aad = ""): string {
  const key = getCredentialKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(secret.iv, "base64"),
    { authTagLength: AUTH_TAG_BYTES },
  );
  if (aad) decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function fingerprintApiKey(apiKey: string): string {
  return createHash("sha256").update(`${getCredentialKey().toString("base64")}:${apiKey}`).digest("hex");
}

export function credentialAad(userId: string, exchange: string, fieldName: string): string {
  return `${userId}:${exchange}:${fieldName}`;
}

function getCredentialKey(): Buffer {
  const configured = env.API_CREDENTIAL_ENCRYPTION_KEY;
  if (configured) {
    if (/^[a-f0-9]{64}$/i.test(configured)) return Buffer.from(configured, "hex");
    const decoded = Buffer.from(configured, "base64");
    if (decoded.length === 32) return decoded;
    throw new Error("API_CREDENTIAL_ENCRYPTION_KEY must be 32-byte base64 or 64-char hex");
  }

  if (env.NODE_ENV === "production") {
    throw new Error("Missing API_CREDENTIAL_ENCRYPTION_KEY in production");
  }

  return createHash("sha256").update(env.ENCRYPTION_KEY).digest();
}
