import { cn } from "@/src/lib/utils";

export function MetricTile({
  label,
  value,
  tone = "neutral",
  subvalue,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "profit" | "loss" | "warning";
  subvalue?: React.ReactNode;
}) {
  const tones = {
    neutral: "text-[#eaecef]",
    profit: "text-[#2ebd85]",
    loss: "text-[#f6465d]",
    warning: "text-[#f0b90b]",
  };
  return (
    <div className="border border-[#1f2630] bg-[#161b22] px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-[#848e9c]">{label}</div>
      <div className={cn("mt-0.5 font-mono text-sm tabular-nums", tones[tone])}>{value}</div>
      {subvalue && <div className="mt-0.5 text-[10px] text-[#5e6673]">{subvalue}</div>}
    </div>
  );
}
