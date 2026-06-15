export function redactCredentialError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replaceAll(/api[-_\s]?key\s*[:=]\s*[^\s,;]+/gi, "apiKey=[redacted]")
    .replaceAll(/secret\s*[:=]\s*[^\s,;]+/gi, "secret=[redacted]")
    .slice(0, 500);
}
