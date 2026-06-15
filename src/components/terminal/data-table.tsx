"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function DataTable<TData>({
  data,
  columns,
  getRowClassName,
  emptyLabel = "No data",
  className,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowClassName?: (row: TData) => string | undefined;
  emptyLabel?: string;
  className?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={cn("h-full min-h-0 overflow-auto", className)}>
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-[#11161c] text-[10px] uppercase tracking-wide text-[#848e9c]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[#2b3139]">
              {headerGroup.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const sort = header.column.getIsSorted();
                return (
                  <th key={header.id} className="h-7 whitespace-nowrap px-2 font-medium">
                    <button
                      type="button"
                      className={cn("flex items-center gap-1", sortable && "hover:text-[#eaecef]")}
                      onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                      disabled={!sortable}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {sortable && (sort === "asc" ? <ArrowUp className="h-3 w-3" /> : sort === "desc" ? <ArrowDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 text-[#5e6673]" />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-2 py-8 text-center text-xs text-[#848e9c]">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "h-8 border-b border-[#1f2630] text-[#c9d1d9] hover:bg-[#161b22]",
                  getRowClassName?.(row.original),
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-2 py-1 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
