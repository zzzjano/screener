"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { DataTable } from "@/src/components/terminal/data-table";
import { MarketChangeCell } from "@/src/components/terminal/market-change-cell";
import { NumberCell } from "@/src/components/terminal/number-cell";
import { Sparkline } from "@/src/components/terminal/sparkline";
import type { InstantScanMatch } from "@screener/shared-types";

export function LiveRadarTable({ rows }: { rows: InstantScanMatch[] }) {
  const columns = useMemo<ColumnDef<InstantScanMatch>[]>(
    () => [
      {
        accessorKey: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <a
            href={bybitTradeUrl(row.original.symbol)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono tabular-nums text-[#2ebd85] hover:text-[#7ee7bd]"
          >
            {row.original.symbol}
            <ExternalLink className="h-3 w-3" />
          </a>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => <NumberCell value={row.original.price} digits={8} />,
      },
      {
        accessorKey: "change24hPct",
        header: "24h",
        cell: ({ row }) => <MarketChangeCell value={row.original.change24hPct} />,
      },
      {
        accessorKey: "fundingRate",
        header: "Funding",
        cell: ({ row }) => (
          <NumberCell
            value={row.original.fundingRate === null ? null : row.original.fundingRate * 100}
            digits={4}
            suffix="%"
            className={Math.abs((row.original.fundingRate ?? 0) * 100) >= 0.05 ? "text-[#f0b90b]" : "text-[#eaecef]"}
          />
        ),
      },
      {
        accessorKey: "volume24h",
        header: "Volume",
        cell: ({ row }) => <NumberCell value={row.original.volume24h} digits={2} compact />,
      },
      {
        accessorKey: "timeframe",
        header: "TF",
        cell: ({ row }) => <span className="font-mono text-[#848e9c]">{row.original.timeframe}</span>,
      },
      {
        id: "trend",
        header: "Trend",
        enableSorting: false,
        cell: ({ row }) => <Sparkline values={[row.original.price * 0.996, row.original.price * 1.002, row.original.price]} />,
      },
      {
        id: "conditions",
        header: "Conditions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex max-w-[360px] flex-wrap gap-1">
            {row.original.matchedConditions.length === 0 ? (
              <span className="text-[#5e6673]">—</span>
            ) : (
              row.original.matchedConditions.map((condition) => (
                <span
                  key={condition.nodeId}
                  className="border border-[#2ebd85]/25 bg-[#2ebd85]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#9af0ca]"
                >
                  {condition.label}
                </span>
              ))
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      data={rows}
      columns={columns}
      emptyLabel="No radar matches"
      getRowClassName={(row) => {
        if ((row.change24hPct ?? 0) > 0) return "animate-flash-profit";
        if ((row.change24hPct ?? 0) < 0) return "animate-flash-loss";
        return undefined;
      }}
    />
  );
}

function bybitTradeUrl(symbol: string): string {
  const slug = symbol.split(":")[0].replace("/", "").toUpperCase();
  return `https://www.bybit.com/trade/usdt/${slug}`;
}
