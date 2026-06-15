"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  KeyRound,
  FlaskConical,
  LayoutDashboard,
  LineChart,
  Settings,
  Wallet,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/src/lib/utils";

const primaryLinks = [
  { href: "/screenery/live", label: "Live Screener", icon: Activity },
  { href: "/screenery", label: "Worker Rules", icon: LineChart },
  { href: "/dashboard/positions", label: "My Positions", icon: Wallet },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/backtest", label: "Backtest", icon: FlaskConical },
];

const secondaryLinks = [
  { href: "/ustawienia/bybit", label: "Bybit API", icon: KeyRound },
  { href: "/alerty", label: "Alerts", icon: Bell },
  { href: "/ustawienia/telegram", label: "Telegram Settings", icon: Settings },
];

export function TerminalSidebar() {
  const pathname = usePathname();
  return (
    <Tooltip.Provider delayDuration={150}>
      <aside className="row-span-2 flex h-dvh w-12 flex-col items-center border-r border-[#2b3139] bg-[#0b0e11] py-1">
        <Link
          href="/dashboard"
          className="mb-2 flex h-9 w-9 items-center justify-center border border-[#2b3139] bg-[#11161c] font-mono text-[10px] font-bold text-[#f0b90b]"
        >
          CS
        </Link>
        <NavGroup links={primaryLinks} pathname={pathname} />
        <div className="mt-auto">
          <NavGroup links={secondaryLinks} pathname={pathname} />
        </div>
      </aside>
    </Tooltip.Provider>
  );
}

function NavGroup({
  links,
  pathname,
}: {
  links: typeof primaryLinks;
  pathname: string;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Tooltip.Root key={link.href}>
            <Tooltip.Trigger asChild>
              <Link
                href={link.href}
                className={cn(
                  "flex h-9 w-9 items-center justify-center border border-transparent text-[#848e9c] transition hover:border-[#2b3139] hover:bg-[#11161c] hover:text-[#eaecef]",
                  active && "border-[#2b3139] bg-[#11161c] text-[#2ebd85]",
                )}
                aria-label={link.label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="right"
                className="z-50 border border-[#2b3139] bg-[#11161c] px-2 py-1 text-xs text-[#eaecef]"
              >
                {link.label}
                <Tooltip.Arrow className="fill-[#2b3139]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        );
      })}
    </nav>
  );
}
