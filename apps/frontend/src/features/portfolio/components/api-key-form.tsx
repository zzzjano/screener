"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Input } from "@/src/components/ui";

interface CredentialMetadata {
  id: string;
  label: string | null;
  keyFingerprint: string;
  status: "ACTIVE" | "DISABLED" | "REVOKED" | "ERROR";
  lastValidatedAt: string | null;
  lastError: string | null;
}

export function ApiKeyForm() {
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/settings/bybit-credentials");
    const data = await response.json() as { credentials: CredentialMetadata[] };
    setCredentials(data.credentials ?? []);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/settings/bybit-credentials")
      .then((response) => response.json())
      .then((data: { credentials: CredentialMetadata[] }) => {
        if (active) setCredentials(data.credentials ?? []);
      })
      .catch(() => {
        if (active) setCredentials([]);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    setStatus("Weryfikacja klucza...");
    const response = await fetch("/api/settings/bybit-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, apiKey, apiSecret }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setStatus(data.error ?? "Nie udało się zapisać klucza.");
      return;
    }
    setLabel("");
    setApiKey("");
    setApiSecret("");
    setStatus("Klucz zapisany i zweryfikowany.");
    await load();
  }

  async function disable(id: string) {
    await fetch(`/api/settings/bybit-credentials/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Bybit API read-only</h2>
          <p className="text-sm text-zinc-500">
            Sekret jest szyfrowany po stronie serwera i nigdy nie jest odsyłany do przeglądarki.
          </p>
        </div>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etykieta (opcjonalnie)" />
        <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" autoComplete="off" />
        <Input
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="API Secret"
          type="password"
          autoComplete="new-password"
        />
        <Button type="button" onClick={submit} disabled={!apiKey || !apiSecret}>
          Zapisz klucz
        </Button>
        {status && <p className="text-sm text-zinc-400">{status}</p>}
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-medium text-zinc-200">Zapisane klucze</h3>
        <div className="space-y-2">
          {credentials.length === 0 ? (
            <p className="text-sm text-zinc-500">Brak zapisanych kluczy.</p>
          ) : (
            credentials.map((credential) => (
              <div key={credential.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 p-3">
                <div>
                  <div className="font-mono text-sm text-zinc-100">{credential.label ?? "Bybit"}</div>
                  <div className="text-xs text-zinc-500">fingerprint: {credential.keyFingerprint}</div>
                  {credential.lastError && <div className="text-xs text-red-400">{credential.lastError}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={credential.status === "ACTIVE" ? "success" : "warning"}>{credential.status}</Badge>
                  {credential.status === "ACTIVE" && (
                    <Button type="button" variant="secondary" onClick={() => disable(credential.id)}>
                      Wyłącz
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
