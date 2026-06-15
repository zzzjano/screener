import Link from "next/link";
import { Activity, Bell, KeyRound, LineChart, Wallet } from "lucide-react";
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
    <div className="grid min-h-full gap-1 p-1 xl:grid-cols-[360px_minmax(0,1fr)]">
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
        <Panel>
          <PanelHeader title="Start here" subtitle="Najkrótsza ścieżka pracy" />
          <PanelBody className="grid gap-1">
            <QuickAction href="/ustawienia/bybit" icon={<KeyRound className="h-4 w-4" />} title="1. Connect Bybit API" description="Wymagane do My Positions i prywatnych warunków." />
            <QuickAction href="/screenery/live" icon={<Activity className="h-4 w-4" />} title="2. Run Live Screener" description="Testuj reguły na rynku bez zapisu." />
            <QuickAction href="/screenery/nowy" icon={<LineChart className="h-4 w-4" />} title="3. Create Worker Rule" description="Zapisz regułę do pracy w tle i alertów." />
            <QuickAction href="/dashboard/positions" icon={<Wallet className="h-4 w-4" />} title="4. Open My Positions" description="Zobacz pozycje, PnL, funding i margin." />
            <QuickAction href="/ustawienia/telegram" icon={<Bell className="h-4 w-4" />} title="5. Connect Telegram" description="Włącz alerty po spełnieniu reguł." />
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

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-2 border border-[#1f2630] bg-[#11161c] px-2 py-2 text-left hover:border-[#2b3139] hover:bg-[#161b22]"
    >
      <span className="mt-0.5 text-[#f0b90b]">{icon}</span>
      <span>
        <span className="block text-xs font-semibold text-[#eaecef]">{title}</span>
        <span className="block text-[11px] leading-snug text-[#848e9c]">{description}</span>
      </span>
    </Link>
  );
}
