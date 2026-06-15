import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, Edit3 } from "lucide-react";
import { pl } from "@/src/lib/i18n/pl";
import { getScreener } from "@/src/features/screeners/actions";
import { ScreenerActions, ScreenerStatusBadge, MatchesList } from "@/src/features/screeners/components/screener-actions";
import { ScreenerPipelineStatus } from "@/src/features/screeners/components/screener-pipeline-status";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";

export default async function ScreenerDetailPage({
  params,
}: {
  params: Promise<{ screenerId: string }>;
}) {
  const { screenerId } = await params;
  const screener = await getScreener(screenerId);
  if (!screener) notFound();

  return (
    <div className="grid min-h-full gap-1 p-1 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Panel>
        <PanelHeader
          title={screener.name}
          subtitle={screener.description || "Worker screener rule"}
          actions={<ScreenerStatusBadge status={screener.status} />}
        />
        <PanelBody className="space-y-2">
          <div className="border border-[#1f2630] bg-[#11161c] p-2 text-xs text-[#c9d1d9]">
            <div className="text-[10px] uppercase tracking-wide text-[#848e9c]">Universe</div>
            <div className="mt-1 font-mono text-[#eaecef]">
              {screener.scanAll ? pl.screener.allUsdtPerps : screener.symbols.join(", ")}
            </div>
            <div className="mt-1 font-mono text-[#848e9c]">{screener.timeframes.join(", ")}</div>
          </div>
          <Link
            href={`/screenery/${screener.id}/edytuj`}
            className="flex h-9 items-center justify-center border border-[#2b3139] bg-[#2ebd85] px-3 text-xs font-semibold text-[#07130f] hover:bg-[#7ee7bd]"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit rules
          </Link>
          <Link
            href="/screenery/live"
            className="flex h-9 items-center justify-center border border-[#2b3139] px-3 text-xs font-semibold text-[#eaecef] hover:bg-[#161b22]"
          >
            <Activity className="mr-2 h-4 w-4" />
            Test in Live Screener
          </Link>
          <ScreenerActions screener={screener} />
          <ScreenerPipelineStatus screener={screener} />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title={pl.screener.matches} subtitle="Latest worker evaluations" />
        <PanelBody>
          <MatchesList matches={screener.matches} />
        </PanelBody>
      </Panel>
    </div>
  );
}
