import { cn } from "@/src/lib/utils";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-h-0 min-w-0 overflow-hidden border border-[#2b3139] bg-[#11161c] shadow-[0_0_0_1px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-8 items-center justify-between gap-2 border-b border-[#1f2630] px-2 py-1", className)}>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold uppercase tracking-wide text-[#eaecef]">{title}</div>
        {subtitle && <div className="truncate text-[10px] text-[#848e9c]">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}

export function PanelBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("min-h-0 min-w-0 overflow-auto p-2", className)}>{children}</div>;
}

export function PanelFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("border-t border-[#1f2630] px-2 py-1", className)}>{children}</div>;
}
