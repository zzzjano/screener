"use client";

import { useState } from "react";
import { Button, Input } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

interface SymbolInputProps {
  symbols: string[];
  onChange: (symbols: string[]) => void;
}

export function SymbolInput({ symbols, onChange }: SymbolInputProps) {
  const [draft, setDraft] = useState("");

  function addSymbol() {
    const symbol = normalizeSymbol(draft);
    if (!symbol || symbols.includes(symbol)) {
      setDraft("");
      return;
    }
    onChange([...symbols, symbol]);
    setDraft("");
  }

  function removeSymbol(symbol: string) {
    onChange(symbols.filter((item) => item !== symbol));
  }

  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-400">{pl.screener.symbols}</label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSymbol();
            }
          }}
          placeholder={pl.symbolInput.placeholder}
          className="font-mono text-sm"
        />
        <Button type="button" variant="secondary" onClick={addSymbol} disabled={!normalizeSymbol(draft)}>
          {pl.symbolInput.add}
        </Button>
      </div>
      <p className="text-xs text-zinc-500">{pl.symbolInput.help}</p>
      {symbols.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {symbols.map((symbol) => (
            <span
              key={symbol}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-200"
            >
              {symbol}
              <button
                type="button"
                onClick={() => removeSymbol(symbol)}
                className="rounded px-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                aria-label={`${pl.common.delete} ${symbol}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">{pl.symbolInput.empty}</p>
      )}
    </div>
  );
}
