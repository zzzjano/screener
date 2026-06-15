"use client";

import { useRouter } from "next/navigation";
import { Button, Badge } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { activateScreener, pauseScreener, deleteScreener } from "@/src/features/screeners/actions";
import type { Screener, ScreenerMatch } from "@prisma/client";

export function ScreenerActions({ screener }: { screener: Screener }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {screener.status !== "ACTIVE" && (
        <Button onClick={async () => { await activateScreener(screener.id); router.refresh(); }}>
          {pl.screener.activate}
        </Button>
      )}
      {screener.status === "ACTIVE" && (
        <Button variant="secondary" onClick={async () => { await pauseScreener(screener.id); router.refresh(); }}>
          {pl.screener.pause}
        </Button>
      )}
      <Button variant="danger" onClick={async () => { await deleteScreener(screener.id); router.push("/screenery"); }}>
        {pl.common.delete}
      </Button>
    </div>
  );
}

export function ScreenerStatusBadge({ status }: { status: Screener["status"] }) {
  const map = {
    ACTIVE: { label: pl.common.active, tone: "success" as const },
    PAUSED: { label: pl.common.paused, tone: "warning" as const },
    DRAFT: { label: pl.common.draft, tone: "default" as const },
    ARCHIVED: { label: pl.common.archived, tone: "default" as const },
  };
  const item = map[status];
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function MatchesList({ matches }: { matches: ScreenerMatch[] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-zinc-500">{pl.screener.noMatches}</p>;
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">
        Poniższa lista pokazuje historię skanowania poszczególnych monet po zamknięciu świecy. 
        Sygnał pojawia się tylko wtedy, gdy w danej minucie spełnione są <b>wszystkie</b> reguły screenera.
      </p>
      <ul className="space-y-2">
        {matches.map((match) => (
          <li key={match.id} className="rounded-lg border border-[#2b3139] bg-[#11161c] px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#eaecef]">{match.symbol} <span className="text-[#848e9c]">· {match.timeframe}</span></span>
              <Badge tone={match.matched ? "success" : "default"}>
                {match.matched ? "Warunki spełnione (Sygnał)" : "Brak sygnału (Odrzucone)"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-[#848e9c]">
              Czas sprawdzenia: {new Date(match.createdAt).toLocaleString("pl-PL")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
