import { beforeEach, describe, expect, it, vi } from "vitest";

describe("credential encryption", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.API_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("decrypts valid ciphertext and rejects modified auth tags", async () => {
    const { encryptSecret, decryptSecret } = await import("@/src/server/security/encryption");
    const encrypted = encryptSecret("secret-value", "user:bybit:apiSecret");

    expect(decryptSecret(encrypted, "user:bybit:apiSecret")).toBe("secret-value");
    expect(() =>
      decryptSecret({ ...encrypted, authTag: Buffer.alloc(16, 1).toString("base64") }, "user:bybit:apiSecret"),
    ).toThrow();
  });
});
