"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
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
        <PanelBody className="space-y-2">
          <div className="border border-[#2b3139] bg-[#161b22] p-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#eaecef]">
              <KeyRound className="h-4 w-4 text-[#f0b90b]" />
              Connect Bybit API first
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#848e9c]">
              Żeby zczytać pozycje, dodaj read-only API key, potem kliknij Synchronizuj.
            </p>
          </div>
          <Link
            href="/ustawienia/bybit"
            className="inline-flex h-8 items-center justify-center border border-[#2b3139] bg-[#2ebd85] px-3 text-xs font-semibold text-[#07130f] hover:bg-[#7ee7bd]"
          >
            Add Bybit API key
          </Link>
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
