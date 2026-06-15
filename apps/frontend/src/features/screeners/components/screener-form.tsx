"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { QueryBuilder } from "@/src/components/query-builder/group-node";
import { SymbolSelector, TimeframeSelector } from "@/src/components/market/symbol-selector";
import { Button, Input } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import { createScreener, updateScreener } from "@/src/features/screeners/actions";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";
import type { RuleTree } from "@screener/shared-types";

interface ScreenerFormProps {
  mode?: "create" | "edit";
  screenerId?: string;
  initialDraft?: {
    name: string;
    description?: string | null;
    symbols: string[];
    scanAll?: boolean;
    timeframes: string[];
    ruleTree: RuleTree;
  };
}

export function ScreenerForm({ mode = "create", screenerId, initialDraft }: ScreenerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);
  const name = useBuilderStore((s) => s.name);
  const description = useBuilderStore((s) => s.description);
  const symbols = useBuilderStore((s) => s.symbols);
  const scanAll = useBuilderStore((s) => s.scanAll);
  const timeframes = useBuilderStore((s) => s.timeframes);
  const setName = useBuilderStore((s) => s.setName);
  const setDescription = useBuilderStore((s) => s.setDescription);
  const setScanAll = useBuilderStore((s) => s.setScanAll);
  const loadDraft = useBuilderStore((s) => s.loadDraft);
  const toRuleTree = useBuilderStore((s) => s.toRuleTree);

  useEffect(() => {
    if (!initialDraft || hydrated.current) return;
    loadDraft(initialDraft);
    hydrated.current = true;
  }, [initialDraft, loadDraft]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name,
        description,
        symbols,
        scanAll,
        timeframes,
        ruleTree: toRuleTree(),
      };
      const screener = mode === "edit" && screenerId
        ? await updateScreener(screenerId, payload)
        : await createScreener(payload);
      router.push(`/screenery/${screener.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : pl.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid min-h-full gap-1 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Panel>
        <PanelHeader
          title={mode === "edit" ? "Edit screener" : pl.screener.new}
          subtitle="Name, market universe and schedule basics"
        />
        <PanelBody className="space-y-2">
        <Input placeholder={pl.screener.name} value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          placeholder={pl.screener.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs text-[#c9d1d9]">
          <input
            type="checkbox"
            checked={scanAll}
            onChange={(e) => setScanAll(e.target.checked)}
            className="rounded border-[#2b3139]"
          />
          {pl.screener.scanAll}
        </label>
        {scanAll && (
          <p className="text-[11px] text-[#848e9c]">{pl.screener.scanAllHint}</p>
        )}
        {!scanAll && <SymbolSelector />}
        <TimeframeSelector />
          {error && <p className="border border-[#f6465d]/30 bg-[#f6465d]/10 px-2 py-1 text-xs text-[#f6465d]">{error}</p>}
          <Button type="submit" disabled={loading || !name} className="w-full">
            {loading ? pl.common.loading : mode === "edit" ? "Save changes" : "Create screener"}
          </Button>
        </PanelBody>
      </Panel>
      <Panel className="min-h-[560px]">
        <PanelHeader
          title="Rules"
          subtitle="Click a condition row to edit. Add condition opens the editor."
        />
        <PanelBody>
          <QueryBuilder />
        </PanelBody>
      </Panel>
    </form>
  );
}
