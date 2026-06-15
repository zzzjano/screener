import Link from "next/link";
import { Activity, Edit3, Plus } from "lucide-react";
import { pl } from "@/src/lib/i18n/pl";
import { listScreeners } from "@/src/features/screeners/actions";
import { ScreenerStatusBadge } from "@/src/features/screeners/components/screener-actions";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";

export default async function ScreenersPage() {
  const screeners = await listScreeners();

  return (
    <div className="grid min-h-full gap-1 p-1 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Panel>
        <PanelHeader title="Worker Rules" subtitle="Saved screeners running in background" />
        <PanelBody className="space-y-2">
          <Link href="/screenery/nowy" className="flex h-9 items-center justify-center border border-[#2b3139] bg-[#2ebd85] px-3 text-xs font-semibold text-[#07130f] hover:bg-[#7ee7bd]">
            <Plus className="mr-2 h-4 w-4" />
            Create new screener
          </Link>
          <Link href="/screenery/live" className="flex h-9 items-center justify-center border border-[#2b3139] px-3 text-xs font-semibold text-[#eaecef] hover:bg-[#161b22]">
            <Activity className="mr-2 h-4 w-4" />
            Test rules in Live Screener
          </Link>
          <p className="text-[11px] leading-relaxed text-[#848e9c]">
            Live Screener is for quick manual scans. Worker Rules are saved and can trigger background alerts.
          </p>
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title={pl.screener.title} subtitle={`${screeners.length} saved rules`} />
      {screeners.length === 0 ? (
        <PanelBody>
          <p className="text-xs text-[#848e9c]">{pl.screener.noScreeners}</p>
        </PanelBody>
      ) : (
        <PanelBody>
          <div className="grid gap-1">
          {screeners.map((screener: any) => (
            <div key={screener.id} className="flex items-center justify-between border border-[#1f2630] bg-[#11161c] px-2 py-2">
              <div>
                <Link href={`/screenery/${screener.id}`} className="text-sm font-semibold text-[#eaecef] hover:text-[#2ebd85]">
                  {screener.name}
                </Link>
                <p className="text-[11px] text-[#848e9c]">{screener.symbols.join(", ")} · {screener.timeframes.join(", ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/screenery/${screener.id}/edytuj`} className="inline-flex h-7 items-center border border-[#2b3139] px-2 text-[11px] text-[#eaecef] hover:bg-[#161b22]">
                  <Edit3 className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Link>
                <span className="font-mono text-[11px] text-[#848e9c]">{screener._count.matches} matches</span>
                <ScreenerStatusBadge status={screener.status} />
              </div>
            </div>
          ))}
          </div>
        </PanelBody>
      )}
      </Panel>
        </div>
  );
}
