"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QueryBuilder } from "@/src/components/query-builder/group-node";
import { SymbolSelector, TimeframeSelector } from "@/src/components/market/symbol-selector";
import { Button, Card, Input } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import { createScreener } from "@/src/features/screeners/actions";

export function ScreenerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = useBuilderStore((s) => s.name);
  const description = useBuilderStore((s) => s.description);
  const symbols = useBuilderStore((s) => s.symbols);
  const timeframes = useBuilderStore((s) => s.timeframes);
  const setName = useBuilderStore((s) => s.setName);
  const setDescription = useBuilderStore((s) => s.setDescription);
  const toRuleTree = useBuilderStore((s) => s.toRuleTree);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const screener = await createScreener({
        name,
        description,
        symbols,
        timeframes,
        ruleTree: toRuleTree(),
      });
      router.push(`/screenery/${screener.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : pl.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="space-y-4">
        <Input placeholder={pl.screener.name} value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          placeholder={pl.screener.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <SymbolSelector />
        <TimeframeSelector />
      </Card>
      <Card>
        <QueryBuilder />
      </Card>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading || !name}>
        {loading ? pl.common.loading : pl.common.save}
      </Button>
    </form>
  );
}
