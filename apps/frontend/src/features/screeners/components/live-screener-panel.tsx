"use client";

import { useMutation } from "@tanstack/react-query";
import { Play, Radar } from "lucide-react";
import { QueryBuilder } from "@/src/components/query-builder/group-node";
import { TimeframeSelector } from "@/src/components/market/symbol-selector";
import { Button } from "@/src/components/ui";
import { MetricTile } from "@/src/components/terminal/metric-tile";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";
import { SkeletonTable } from "@/src/components/terminal/skeleton-table";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import type { InstantScanResult } from "@screener/shared-types";
import { LiveRadarTable } from "./live-radar-table";

export function LiveScreenerPanel() {
  const toRuleTree = useBuilderStore((s) => s.toRuleTree);
  const scanMutation = useMutation({
    mutationKey: ["screeners", "live"],
    mutationFn: async (): Promise<InstantScanResult> => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/screeners/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleTree: toRuleTree() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? pl.common.error);
      }
      
      const { jobId } = data;
      if (!jobId) throw new Error("Nie otrzymano ID zadania od serwera");

      while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusRes = await fetch(`${apiUrl}/screeners/live/${jobId}`);
        const statusData = await statusRes.json();
        
        if (!statusRes.ok) {
          throw new Error(statusData.error ?? "Błąd sprawdzania statusu zadania");
        }

        if (statusData.status === "completed") {
          return statusData.results;
        } else if (statusData.status === "failed") {
          throw new Error(statusData.error ?? "Skanowanie zakończone błędem");
        }
      }
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
      <Panel className="grid min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto]">
        <PanelHeader
          title={pl.liveScreener.title}
          subtitle={pl.liveScreener.subtitle}
        />
        <PanelBody className="space-y-2 border-b border-[#1f2630]">
          <TimeframeSelector />
          {error && <p className="border border-[#f6465d]/30 bg-[#f6465d]/10 px-2 py-1 text-xs text-[#f6465d]">{error}</p>}
        </PanelBody>
        <PanelBody className="min-h-0 overflow-auto">
          <QueryBuilder />
        </PanelBody>
        <div className="border-t border-[#2b3139] bg-[#11161c] p-2">
          <Button
            type="button"
            onClick={handleScan}
            disabled={loading}
            className="h-11 w-full border border-[#2b3139] bg-[#2ebd85] text-sm font-semibold text-[#07130f] hover:bg-[#7ee7bd] disabled:opacity-60"
          >
            <Play className="mr-2 h-4 w-4 fill-current" />
            {loading ? "Przetwarzanie w tle..." : pl.liveScreener.scanMarket}
          </Button>
          <p className="mt-1.5 text-center text-[10px] leading-relaxed text-[#848e9c]">
            Ustaw warunki powyżej, potem kliknij ten przycisk, aby przeskanować cały rynek.
          </p>
        </div>
      </Panel>

      <Panel className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
        <PanelHeader
          title="Live Radar"
          subtitle={pl.liveScreener.scanHint}
          actions={
            <Button
              type="button"
              variant="secondary"
              onClick={handleScan}
              disabled={loading}
              className="h-8 border-[#2b3139] px-3 text-xs font-semibold"
            >
              <Radar className="mr-1.5 h-3.5 w-3.5" />
              {loading ? "..." : "Skanuj"}
            </Button>
          }
        />
        <div className="grid grid-cols-3 gap-1 border-b border-[#1f2630] p-1">
          <MetricTile label={pl.liveScreener.scanned} value={result?.scanned ?? "—"} />
          <MetricTile label={pl.liveScreener.matched} value={result?.matched ?? "—"} tone={(result?.matched ?? 0) > 0 ? "profit" : "neutral"} />
          <MetricTile label={pl.liveScreener.duration} value={result ? `${(result.durationMs / 1000).toFixed(1)}s` : "—"} />
        </div>
        {loading ? (
          <SkeletonTable rows={16} columns={8} />
        ) : !result ? (
          <PanelBody className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="border border-[#2b3139] bg-[#161b22] p-4">
              <Radar className="mx-auto h-8 w-8 text-[#f0b90b]" />
              <p className="mt-2 text-sm font-semibold text-[#eaecef]">Gotowy do skanu</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#848e9c]">
                Ustaw reguły po lewej stronie, a następnie uruchom skanowanie całego rynku Bybit USDT.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleScan}
              disabled={loading}
              className="h-10 min-w-[220px] border border-[#2b3139] bg-[#2ebd85] px-6 text-sm font-semibold text-[#07130f] hover:bg-[#7ee7bd]"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              {pl.liveScreener.scanMarket}
            </Button>
          </PanelBody>
        ) : result.results.length === 0 ? (
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
