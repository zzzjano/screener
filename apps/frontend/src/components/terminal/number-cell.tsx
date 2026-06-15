import { cn } from "@/src/lib/utils";

export function NumberCell({
  value,
  digits = 4,
  compact = false,
  suffix = "",
  className,
}: {
  value: number | null | undefined;
  digits?: number;
  compact?: boolean;
  suffix?: string;
  className?: string;
}) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="font-mono tabular-nums text-[#5e6673]">—</span>;
  }
  return (
    <span className={cn("font-mono tabular-nums text-[#eaecef]", className)}>
      {new Intl.NumberFormat("en-US", {
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: digits,
      }).format(value)}
      {suffix}
    </span>
  );
}
