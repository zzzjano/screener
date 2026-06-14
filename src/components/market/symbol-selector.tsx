"use client";

import { SymbolInput } from "@/src/components/market/symbol-input";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

export function SymbolSelector() {
  const symbols = useBuilderStore((s) => s.symbols);
  const setSymbols = useBuilderStore((s) => s.setSymbols);

  return <SymbolInput symbols={symbols} onChange={setSymbols} />;
}

export function TimeframeSelector() {
  const timeframes = useBuilderStore((s) => s.timeframes);
  const setTimeframes = useBuilderStore((s) => s.setTimeframes);

  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-400">{pl.screener.timeframes}</label>
      <div className="flex flex-wrap gap-2">
        {TIMEFRAMES.map((tf) => {
          const active = timeframes.includes(tf);
          return (
            <button
              key={tf}
              type="button"
              onClick={() =>
                setTimeframes(active ? timeframes.filter((t) => t !== tf) : [...timeframes, tf])
              }
              className={`rounded-md border px-2.5 py-1 font-mono text-xs transition ${
                active
                  ? "border-emerald-600 bg-emerald-600/20 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {tf}
            </button>
          );
        })}
      </div>
    </div>
  );
}
