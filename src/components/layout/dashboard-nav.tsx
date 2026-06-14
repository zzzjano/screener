"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { pl } from "@/src/lib/i18n/pl";
import { cn } from "@/src/lib/utils";

const links = [
  { href: "/dashboard", label: pl.nav.dashboard },
  { href: "/screenery", label: pl.nav.screeners },
  { href: "/screenery/live", label: pl.nav.liveScreener },
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
            "rounded-lg px-3 py-2 text-sm transition",
            pathname.startsWith(link.href)
              ? "bg-emerald-600/20 text-emerald-300"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">{pl.app.name}</h1>
          <p className="text-xs text-zinc-500">{pl.app.tagline}</p>
        </div>
      </div>
    </header>
  );
}
