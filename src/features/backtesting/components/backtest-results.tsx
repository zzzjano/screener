import { MetricTile } from "@/src/components/terminal/metric-tile";

interface BacktestResultsProps {
  metrics?: {
    signalCount?: number;
    winRatePct?: number;
    maxDrawdownPct?: number;
    averageReturnPct?: number;
  } | null;
}

export function BacktestResults({ metrics }: BacktestResultsProps) {
  if (!metrics) return <p className="text-xs text-[#848e9c]">Brak wyników backtestu.</p>;
  return (
    <div className="grid gap-1 md:grid-cols-4">
      <MetricTile label="Sygnały" value={metrics.signalCount ?? 0} />
      <MetricTile label="Win Rate" value={`${(metrics.winRatePct ?? 0).toFixed(2)}%`} tone={(metrics.winRatePct ?? 0) >= 50 ? "profit" : "warning"} />
      <MetricTile label="Max DD" value={`${(metrics.maxDrawdownPct ?? 0).toFixed(2)}%`} tone="loss" />
      <MetricTile label="Avg Return" value={`${(metrics.averageReturnPct ?? 0).toFixed(2)}%`} tone={(metrics.averageReturnPct ?? 0) >= 0 ? "profit" : "loss"} />
    </div>
  );
}
