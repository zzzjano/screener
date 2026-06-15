"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { pl } from "@/src/lib/i18n/pl";
import { cn } from "@/src/lib/utils";
import { TerminalTopbar } from "../terminal/terminal-topbar";

const links = [
  { href: "/dashboard", label: pl.nav.dashboard },
  { href: "/screenery", label: pl.nav.screeners },
  { href: "/screenery/live", label: pl.nav.liveScreener },
  { href: "/dashboard/positions", label: "My Positions" },
  { href: "/ustawienia/bybit", label: "Bybit API" },
  { href: "/alerty", label: pl.nav.alerts },
  { href: "/ustawienia/telegram", label: pl.nav.telegram },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "border border-transparent px-2 py-1.5 text-xs transition",
            pathname.startsWith(link.href)
              ? "border-[#2b3139] bg-[#11161c] text-[#2ebd85]"
              : "text-[#848e9c] hover:border-[#2b3139] hover:bg-[#11161c] hover:text-[#eaecef]",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppHeader() {
  return <TerminalTopbar />;
}
