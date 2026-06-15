import { notFound } from "next/navigation";
import { getScreener } from "@/src/features/screeners/actions";
import { ScreenerForm } from "@/src/features/screeners/components/screener-form";
import type { RuleTree } from "@/src/server/rules/ast";

export default async function EditScreenerPage({
  params,
}: {
  params: Promise<{ screenerId: string }>;
}) {
  const { screenerId } = await params;
  const screener = await getScreener(screenerId);
  if (!screener) notFound();

  return (
    <div className="min-h-full p-1">
      <ScreenerForm
        mode="edit"
        screenerId={screener.id}
        initialDraft={{
          name: screener.name,
          description: screener.description,
          symbols: screener.symbols,
          timeframes: screener.timeframes,
          ruleTree: screener.ruleTree as unknown as RuleTree,
        }}
      />
    </div>
  );
}
