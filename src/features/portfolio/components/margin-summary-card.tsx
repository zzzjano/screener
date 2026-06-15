"use client";

import { MetricTile } from "@/src/components/terminal/metric-tile";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";

interface Summary {
  accountType?: string | null;
  totalEquity?: number | null;
  availableBalance?: number | null;
  maintenanceMargin?: number | null;
  initialMargin?: number | null;
}

export function MarginSummaryCard({ summary, stale }: { summary: Summary | null; stale?: boolean }) {
  return (
    <Panel>
      <PanelHeader
        title="Margin"
        subtitle="Private Bybit account snapshot"
        actions={stale ? <span className="font-mono text-[10px] uppercase text-[#f0b90b]">stale</span> : null}
      />
      {!summary ? (
        <PanelBody>
          <p className="text-xs text-[#848e9c]">Brak danych portfolio. Uruchom synchronizację po dodaniu klucza.</p>
        </PanelBody>
      ) : (
        <PanelBody className="grid gap-1 sm:grid-cols-4">
          <MetricTile label="Equity" value={formatNumber(summary.totalEquity)} />
          <MetricTile label="Available" value={formatNumber(summary.availableBalance)} />
          <MetricTile label="Initial Margin" value={formatNumber(summary.initialMargin)} />
          <MetricTile label="Maintenance" value={formatNumber(summary.maintenanceMargin)} />
        </PanelBody>
      )}
    </Panel>
  );
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}
