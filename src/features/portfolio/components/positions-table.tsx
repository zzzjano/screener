"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/src/components/ui";
import { DataTable } from "@/src/components/terminal/data-table";
import { MarketChangeCell } from "@/src/components/terminal/market-change-cell";
import { NumberCell } from "@/src/components/terminal/number-cell";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";
import { SkeletonTable } from "@/src/components/terminal/skeleton-table";
import { MarginSummaryCard } from "./margin-summary-card";

interface PositionRow {
  symbol: string;
  side: string;
  contracts: number | null;
  entryPrice: number | null;
  markPrice: number | null;
  publicPrice: number | null;
  notional: number | null;
  leverage: number | null;
  unrealizedPnl: number | null;
  pnlPct: number | null;
  liquidationPrice: number | null;
  fundingRate: number | null;
  change24hPct: number | null;
}

interface PortfolioResponse {
  summary: {
    totalEquity?: number | null;
    availableBalance?: number | null;
    maintenanceMargin?: number | null;
    initialMargin?: number | null;
  } | null;
  positions: PositionRow[];
  stale: boolean;
}

export function PositionsTable() {
  const queryClient = useQueryClient();
  const { data = { summary: null, positions: [], stale: true }, isLoading } = useQuery({
    queryKey: ["portfolio", "positions"],
    queryFn: async (): Promise<PortfolioResponse> => {
      const response = await fetch("/api/portfolio/positions");
      if (!response.ok) throw new Error("Failed to load portfolio positions");
      return response.json() as Promise<PortfolioResponse>;
    },
    refetchInterval: 30_000,
  });
  const syncMutation = useMutation({
    mutationKey: ["portfolio", "sync"],
    mutationFn: async () => {
      const response = await fetch("/api/portfolio/sync", { method: "POST" });
      if (!response.ok) throw new Error("Failed to queue portfolio sync");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portfolio", "positions"] });
    },
  });

  const columns = useMemo<ColumnDef<PositionRow>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => <span className="font-mono tabular-nums text-[#eaecef]">{row.original.symbol}</span>,
      },
      {
        accessorKey: "side",
        header: "Side",
        cell: ({ row }) => (
          <span className={row.original.side === "LONG" ? "font-mono text-[#2ebd85]" : "font-mono text-[#f6465d]"}>
            {row.original.side}
          </span>
        ),
      },
      {
        accessorKey: "contracts",
        header: "Size",
        cell: ({ row }) => <NumberCell value={row.original.contracts} digits={4} />,
      },
      {
        accessorKey: "entryPrice",
        header: "Entry",
        cell: ({ row }) => <NumberCell value={row.original.entryPrice} digits={6} />,
      },
      {
        accessorKey: "publicPrice",
        header: "Mark",
        cell: ({ row }) => <NumberCell value={row.original.publicPrice ?? row.original.markPrice} digits={6} />,
      },
      {
        accessorKey: "pnlPct",
        header: "PnL %",
        cell: ({ row }) => <MarketChangeCell value={row.original.pnlPct} />,
      },
      {
        accessorKey: "unrealizedPnl",
        header: "PnL",
        cell: ({ row }) => <NumberCell value={row.original.unrealizedPnl} digits={4} className={tone(row.original.unrealizedPnl)} />,
      },
      {
        accessorKey: "notional",
        header: "Notional",
        cell: ({ row }) => <NumberCell value={row.original.notional} digits={2} compact />,
      },
      {
        accessorKey: "leverage",
        header: "Lev",
        cell: ({ row }) => <NumberCell value={row.original.leverage} digits={2} suffix="x" />,
      },
      {
        accessorKey: "fundingRate",
        header: "Funding",
        cell: ({ row }) => (
          <NumberCell
            value={row.original.fundingRate === null ? null : row.original.fundingRate * 100}
            digits={4}
            suffix="%"
            className={Math.abs((row.original.fundingRate ?? 0) * 100) >= 0.05 ? "text-[#f0b90b]" : undefined}
          />
        ),
      },
      {
        accessorKey: "change24hPct",
        header: "24h",
        cell: ({ row }) => <MarketChangeCell value={row.original.change24hPct} />,
      },
      {
        accessorKey: "liquidationPrice",
        header: "Liq",
        cell: ({ row }) => <NumberCell value={row.original.liquidationPrice} digits={6} />,
      },
    ],
    [],
  );

  function sync() {
    syncMutation.mutate();
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1">
      <MarginSummaryCard summary={data.summary} stale={data.stale} />
      <Panel className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
        <PanelHeader
          title="My Positions"
          subtitle="Private positions merged with public ticker and funding context"
          actions={
          <Button type="button" variant="secondary" onClick={sync} disabled={isLoading || syncMutation.isPending}>
            Synchronizuj
          </Button>
          }
        />
        {isLoading ? (
          <SkeletonTable rows={14} columns={12} />
        ) : data.positions.length === 0 ? (
          <PanelBody>
            <p className="text-xs text-[#848e9c]">Brak aktywnych pozycji.</p>
          </PanelBody>
        ) : (
          <DataTable data={data.positions} columns={columns} emptyLabel="No active positions" />
        )}
      </Panel>
    </div>
  );
}

function tone(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "text-[#848e9c]";
  return value >= 0 ? "text-[#2ebd85]" : "text-[#f6465d]";
}
