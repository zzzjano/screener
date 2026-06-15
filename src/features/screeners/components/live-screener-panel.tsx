"use client";

import { useMutation } from "@tanstack/react-query";
import { QueryBuilder } from "@/src/components/query-builder/group-node";
import { TimeframeSelector } from "@/src/components/market/symbol-selector";
import { Button } from "@/src/components/ui";
import { MetricTile } from "@/src/components/terminal/metric-tile";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";
import { SkeletonTable } from "@/src/components/terminal/skeleton-table";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import type { InstantScanResult } from "@/src/server/screeners/instant-scan";
import { LiveRadarTable } from "./live-radar-table";

export function LiveScreenerPanel() {
  const toRuleTree = useBuilderStore((s) => s.toRuleTree);
  const scanMutation = useMutation({
    mutationKey: ["screeners", "live"],
    mutationFn: async (): Promise<InstantScanResult> => {
      const response = await fetch("/api/screeners/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleTree: toRuleTree() }),
      });
      const data = (await response.json()) as InstantScanResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? pl.common.error);
      }
      return data;
    },
  });
  const loading = scanMutation.isPending;
  const error = scanMutation.error instanceof Error ? scanMutation.error.message : null;
  const result = scanMutation.data ?? null;

  async function handleScan() {
    scanMutation.mutate();
  }

  return (
    <div className="grid h-full min-h-0 gap-1 xl:grid-cols-[420px_minmax(0,1fr)_320px]">
      <Panel className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
        <PanelHeader
          title={pl.liveScreener.title}
          subtitle={pl.liveScreener.subtitle}
          actions={
            <Button type="button" onClick={handleScan} disabled={loading} className="h-7 px-2 text-xs">
              {loading ? "Scanning" : "Scan"}
            </Button>
          }
        />
        <PanelBody className="space-y-2 border-b border-[#1f2630]">
          <TimeframeSelector />
          {error && <p className="border border-[#f6465d]/30 bg-[#f6465d]/10 px-2 py-1 text-xs text-[#f6465d]">{error}</p>}
        </PanelBody>
        <PanelBody>
          <QueryBuilder />
        </PanelBody>
      </Panel>

      <Panel className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
        <PanelHeader title="Live Radar" subtitle={pl.liveScreener.scanHint} />
        <div className="grid grid-cols-3 gap-1 border-b border-[#1f2630] p-1">
          <MetricTile label={pl.liveScreener.scanned} value={result?.scanned ?? "—"} />
          <MetricTile label={pl.liveScreener.matched} value={result?.matched ?? "—"} tone={(result?.matched ?? 0) > 0 ? "profit" : "neutral"} />
          <MetricTile label={pl.liveScreener.duration} value={result ? `${(result.durationMs / 1000).toFixed(1)}s` : "—"} />
        </div>
        {loading ? (
          <SkeletonTable rows={16} columns={8} />
        ) : !result || result.results.length === 0 ? (
          <PanelBody>
            <p className="text-xs text-[#848e9c]">{pl.liveScreener.noResults}</p>
          </PanelBody>
        ) : (
          <LiveRadarTable rows={result.results} />
        )}
      </Panel>

      <Panel className="hidden min-h-0 grid-rows-[auto_minmax(0,1fr)] xl:grid">
        <PanelHeader title="Context" subtitle="Portfolio and selected symbol inspector" />
        <PanelBody className="space-y-2">
          <MetricTile label="Mode" value="Bybit Linear" />
          <MetricTile label="Risk Lens" value="Funding / PnL" tone="warning" />
          <p className="text-xs leading-relaxed text-[#848e9c]">
            Select a radar row to pin symbol context here in the next iteration. Portfolio data is available in My Positions.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
