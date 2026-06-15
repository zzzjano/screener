import Link from "next/link";
import { pl } from "@/src/lib/i18n/pl";
import { getScreenersForDashboard, getRecentMatches } from "@/src/features/screeners/queries";
import { ScreenerStatusBadge } from "@/src/features/screeners/components/screener-actions";
import { MetricTile } from "@/src/components/terminal/metric-tile";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";

export default async function DashboardPage() {
  const [screeners, matches] = await Promise.all([
    getScreenersForDashboard(),
    getRecentMatches(),
  ]);

  return (
    <div className="grid min-h-full gap-1 p-1 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-1">
        <Panel>
          <PanelHeader
            title={pl.nav.dashboard}
            subtitle="Command center overview"
            actions={
              <Link href="/screenery/nowy" className="text-xs text-[#2ebd85] hover:text-[#7ee7bd]">
                {pl.screener.new}
              </Link>
            }
          />
          <PanelBody className="grid gap-1">
            <MetricTile label={pl.screener.title} value={screeners.length} tone="profit" />
            <MetricTile label={pl.screener.matches} value={matches.length} tone={matches.length > 0 ? "profit" : "neutral"} />
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title={pl.screener.title} subtitle="Worker rules and latest status" />
        <PanelBody>
          <ul className="space-y-1">
            {screeners.map((screener) => (
              <li key={screener.id} className="flex items-center justify-between border border-[#1f2630] bg-[#11161c] px-2 py-1">
                <Link href={`/screenery/${screener.id}`} className="text-xs text-[#eaecef] hover:text-[#2ebd85]">
                  {screener.name}
                </Link>
                <ScreenerStatusBadge status={screener.status} />
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>
    </div>
  );
}
