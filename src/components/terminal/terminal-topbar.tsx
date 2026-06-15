import { Activity, Circle } from "lucide-react";
import { pl } from "@/src/lib/i18n/pl";

export function TerminalTopbar() {
  return (
    <header className="flex h-8 items-center justify-between border-b border-[#2b3139] bg-[#0b0e11] px-2">
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-[#f0b90b]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#eaecef]">{pl.app.name}</span>
        <span className="hidden text-[10px] text-[#5e6673] sm:inline">{pl.app.tagline}</span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-[#848e9c]">
        <span className="flex items-center gap-1 text-[#2ebd85]">
          <Circle className="h-2 w-2 fill-current" />
          Online
        </span>
        <span className="hidden sm:inline">Bybit USDT Perps</span>
      </div>
    </header>
  );
}
