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
    return <p className="text-sm text-zinc-500">{pl.screener.noScreeners}</p>;
  }
  return (
    <ul className="space-y-2">
      {matches.map((match) => (
        <li key={match.id} className="rounded-lg border border-zinc-800 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-200">{match.symbol} · {match.timeframe}</span>
            <Badge tone={match.matched ? "success" : "default"}>
              {match.matched ? "TAK" : "NIE"}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">{new Date(match.createdAt).toLocaleString("pl-PL")}</p>
        </li>
      ))}
    </ul>
  );
}
