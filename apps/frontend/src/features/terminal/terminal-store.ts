"use client";

import { create } from "zustand";

interface TerminalState {
  selectedSymbol: string | null;
  activeDrawer: "symbol" | "builder" | "debug" | null;
  tableDensity: "compact" | "dense";
  columnVisibility: Record<string, boolean>;
  setSelectedSymbol: (symbol: string | null) => void;
  setActiveDrawer: (drawer: TerminalState["activeDrawer"]) => void;
  setTableDensity: (density: TerminalState["tableDensity"]) => void;
  setColumnVisibility: (columnId: string, visible: boolean) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  selectedSymbol: null,
  activeDrawer: null,
  tableDensity: "compact",
  columnVisibility: {},
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
  setActiveDrawer: (activeDrawer) => set({ activeDrawer }),
  setTableDensity: (tableDensity) => set({ tableDensity }),
  setColumnVisibility: (columnId, visible) =>
    set((state) => ({
      columnVisibility: { ...state.columnVisibility, [columnId]: visible },
    })),
}));
