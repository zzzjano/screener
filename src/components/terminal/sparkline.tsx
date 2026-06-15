import { cn } from "@/src/lib/utils";

export function Sparkline({
  values,
  className,
}: {
  values?: number[];
  className?: string;
}) {
  if (!values || values.length < 2) {
    return <div className={cn("h-6 w-20 border border-[#1f2630] bg-[#0b0e11]", className)} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 80;
      const y = 22 - ((value - min) / span) * 20;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const up = values[values.length - 1] >= values[0];

  return (
    <svg viewBox="0 0 80 24" className={cn("h-6 w-20", className)} role="img" aria-label="Trend">
      <polyline
        points={points}
        fill="none"
        stroke={up ? "#2ebd85" : "#f6465d"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
