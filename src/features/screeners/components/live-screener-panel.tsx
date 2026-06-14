"use client";

import { useState } from "react";
import { QueryBuilder } from "@/src/components/query-builder/group-node";
import { TimeframeSelector } from "@/src/components/market/symbol-selector";
import { Button, Card } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import type { InstantScanResult } from "@/src/server/screeners/instant-scan";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 8 }).format(value);
}

function formatVolume(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pl-PL", {
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(value);
}

export function LiveScreenerPanel() {
  const toRuleTree = useBuilderStore((s) => s.toRuleTree);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InstantScanResult | null>(null);

  async function handleScan() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/screeners/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleTree: toRuleTree() }),
      });
      const data = (await response.json()) as InstantScanResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? pl.common.error);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : pl.common.error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{pl.liveScreener.title}</h3>
          <p className="mt-1 text-sm text-zinc-500">{pl.liveScreener.subtitle}</p>
        </div>
        <TimeframeSelector />
      </Card>

      <Card>
        <QueryBuilder />
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleScan} disabled={loading}>
          {loading ? pl.liveScreener.scanning : pl.liveScreener.scanMarket}
        </Button>
        {result && (
          <p className="text-sm text-zinc-400">
            {pl.liveScreener.scanned}: {result.scanned} · {pl.liveScreener.matched}: {result.matched} ·{" "}
            {pl.liveScreener.duration}: {(result.durationMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h3 className="text-sm font-medium text-zinc-200">{pl.liveScreener.results}</h3>
        </div>
        {loading ? (
          <p className="px-4 py-6 text-sm text-zinc-500">{pl.liveScreener.scanning}</p>
        ) : !result || result.results.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">{pl.liveScreener.noResults}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-950/80 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">{pl.liveScreener.symbol}</th>
                  <th className="px-4 py-3">{pl.liveScreener.price}</th>
                  <th className="px-4 py-3">{pl.liveScreener.volume24h}</th>
                  <th className="px-4 py-3">{pl.liveScreener.timeframe}</th>
                  <th className="px-4 py-3">{pl.liveScreener.conditions}</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row) => (
                  <tr key={row.symbol} className="border-t border-zinc-800/80 hover:bg-zinc-900/50">
                    <td className="px-4 py-3 font-mono text-emerald-300">{row.symbol}</td>
                    <td className="px-4 py-3 font-mono text-zinc-200">{formatNumber(row.price)}</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{formatVolume(row.volume24h)}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{row.timeframe}</td>
                    <td className="max-w-md px-4 py-3 text-xs text-zinc-500">
                      {row.matchedConditions.join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
