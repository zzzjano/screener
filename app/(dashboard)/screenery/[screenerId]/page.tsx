import { notFound } from "next/navigation";
import { Card } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { getScreener } from "@/src/features/screeners/actions";
import { ScreenerActions, ScreenerStatusBadge, MatchesList } from "@/src/features/screeners/components/screener-actions";

export default async function ScreenerDetailPage({
  params,
}: {
  params: Promise<{ screenerId: string }>;
}) {
  const { screenerId } = await params;
  const screener = await getScreener(screenerId);
  if (!screener) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">{screener.name}</h2>
            <ScreenerStatusBadge status={screener.status} />
          </div>
          {screener.description && <p className="mt-2 text-sm text-zinc-400">{screener.description}</p>}
          <p className="mt-2 text-xs text-zinc-500">
            {screener.symbols.join(", ")} · {screener.timeframes.join(", ")}
          </p>
        </div>
        <ScreenerActions screener={screener} />
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-medium text-zinc-300">{pl.screener.matches}</h3>
        <MatchesList matches={screener.matches} />
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-medium text-zinc-300">{pl.queryBuilder.preview}</h3>
        <pre className="overflow-auto text-xs text-zinc-400">{JSON.stringify(screener.ruleTree, null, 2)}</pre>
      </Card>
    </div>
  );
}
