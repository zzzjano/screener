import Link from "next/link";
import { Card } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { getScreenersForDashboard, getRecentMatches } from "@/src/features/screeners/queries";
import { ScreenerStatusBadge } from "@/src/features/screeners/components/screener-actions";

export default async function DashboardPage() {
  const [screeners, matches] = await Promise.all([
    getScreenersForDashboard(),
    getRecentMatches(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{pl.nav.dashboard}</h2>
        <Link href="/screenery/nowy" className="text-sm text-emerald-400 hover:underline">
          {pl.screener.new}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-medium text-zinc-300">{pl.screener.title}</h3>
          <p className="text-3xl font-bold text-emerald-400">{screeners.length}</p>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-medium text-zinc-300">{pl.screener.matches}</h3>
          <p className="text-3xl font-bold text-emerald-400">{matches.length}</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-medium text-zinc-300">{pl.screener.title}</h3>
        <ul className="space-y-2">
          {screeners.map((screener) => (
            <li key={screener.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
              <Link href={`/screenery/${screener.id}`} className="text-sm text-zinc-200 hover:text-emerald-300">
                {screener.name}
              </Link>
              <ScreenerStatusBadge status={screener.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
