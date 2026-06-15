import { cn } from "@/src/lib/utils";

export function SkeletonTable({
  rows = 12,
  columns = 6,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid h-8 animate-pulse border-b border-[#1f2630]" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, col) => (
            <div key={col} className="flex items-center px-2">
              <div className="h-3 w-full bg-[#1f2630]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
