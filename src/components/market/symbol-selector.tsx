"use client";

import { Input } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";

const POPULAR_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"];
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

export function SymbolSelector() {
  const symbols = useBuilderStore((s) => s.symbols);
  const setSymbols = useBuilderStore((s) => s.setSymbols);

  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-400">{pl.screener.symbols}</label>
      <div className="flex flex-wrap gap-2">
        {POPULAR_SYMBOLS.map((symbol) => {
          const active = symbols.includes(symbol);
          return (
            <button
              key={symbol}
              type="button"
              onClick={() =>
                setSymbols(active ? symbols.filter((s) => s !== symbol) : [...symbols, symbol])
              }
              className={`rounded-lg px-3 py-1.5 text-xs ${active ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300"}`}
            >
              {symbol}
            </button>
          );
        })}
      </div>
      <Input
        value={symbols.join(", ")}
        onChange={(e) => setSymbols(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder="BTCUSDT, ETHUSDT"
      />
    </div>
  );
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
              className={`rounded-lg px-3 py-1.5 text-xs ${active ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300"}`}
            >
              {tf}
            </button>
          );
        })}
      </div>
    </div>
  );
}
