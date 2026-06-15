import { cn } from "@/src/lib/utils";

export function MarketChangeCell({
  value,
  digits = 2,
  className,
}: {
  value: number | null | undefined;
  digits?: number;
  className?: string;
}) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="font-mono tabular-nums text-[#5e6673]">—</span>;
  }
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        value > 0 ? "text-[#2ebd85]" : value < 0 ? "text-[#f6465d]" : "text-[#848e9c]",
        className,
      )}
    >
      {value >= 0 ? "+" : ""}
      {value.toFixed(digits)}%
    </span>
  );
}
