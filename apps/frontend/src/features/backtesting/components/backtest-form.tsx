"use client";

import { useState } from "react";
import { Button, Input } from "@/src/components/ui";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";

export function BacktestForm() {
  const toRuleTree = useBuilderStore((s) => s.toRuleTree);
  const [symbols, setSymbols] = useState("BTCUSDT");
  const [takeProfitPct, setTakeProfitPct] = useState(3);
  const [stopLossPct, setStopLossPct] = useState(1.5);
  const [maxBars, setMaxBars] = useState(24);
  const [status, setStatus] = useState<string | null>(null);

  async function submit() {
    setStatus("Tworzenie backtestu...");
    const response = await fetch("/api/backtests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ruleTree: toRuleTree(),
        symbols: symbols.split(",").map((s) => s.trim()).filter(Boolean),
        timeframes: ["15m"],
        startTime: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        exitConfig: { kind: "EITHER", takeProfitPct, stopLossPct, maxBars },
      }),
    });
    setStatus(response.ok ? "Backtest dodany do kolejki." : "Nie udało się utworzyć backtestu.");
  }

  return (
    <div className="space-y-3">
      <Input value={symbols} onChange={(e) => setSymbols(e.target.value)} placeholder="BTCUSDT, ETHUSDT" />
      <div className="grid gap-2 md:grid-cols-3">
        <Input type="number" value={takeProfitPct} onChange={(e) => setTakeProfitPct(Number(e.target.value))} />
        <Input type="number" value={stopLossPct} onChange={(e) => setStopLossPct(Number(e.target.value))} />
        <Input type="number" value={maxBars} onChange={(e) => setMaxBars(Number(e.target.value))} />
      </div>
      <Button type="button" onClick={submit}>Uruchom backtest</Button>
      {status && <p className="text-sm text-zinc-400">{status}</p>}
    </div>
  );
}
