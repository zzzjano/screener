import Link from "next/link";
import { Card } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { listScreeners } from "@/src/features/screeners/actions";
import { ScreenerStatusBadge } from "@/src/features/screeners/components/screener-actions";

export default async function ScreenersPage() {
  const screeners = await listScreeners();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{pl.screener.title}</h2>
        <Link href="/screenery/nowy" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500">
          {pl.screener.new}
        </Link>
        <Link href="/screenery/live" className="rounded-lg border border-emerald-700 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-950/40">
          {pl.nav.liveScreener}
        </Link>
      </div>

      {screeners.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-400">{pl.screener.noScreeners}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {screeners.map((screener) => (
            <Card key={screener.id} className="flex items-center justify-between">
              <div>
                <Link href={`/screenery/${screener.id}`} className="text-lg font-medium text-zinc-100 hover:text-emerald-300">
                  {screener.name}
                </Link>
                <p className="text-sm text-zinc-500">{screener.symbols.join(", ")} · {screener.timeframes.join(", ")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">{screener._count.matches} {pl.screener.matches.toLowerCase()}</span>
                <ScreenerStatusBadge status={screener.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
