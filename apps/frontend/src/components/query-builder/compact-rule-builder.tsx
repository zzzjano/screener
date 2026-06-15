"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Code2, Save, X, Trash2, Settings2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, Input, Select } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import type { RuleTree } from "@screener/shared-types";
import { RuleGroupBar } from "./rule-group-bar";

interface LivePreset {
  id: string;
  name: string;
  ruleTree: RuleTree;
}

export function CompactRuleBuilder() {
  const [debugOpen, setDebugOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<LivePreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const root = useBuilderStore((s) => s.root);
  const toRuleTree = useBuilderStore((s) => s.toRuleTree);
  const loadDraft = useBuilderStore((s) => s.loadDraft);

  const fetchPresets = useCallback(async () => {
    setLoadingPresets(true);
    try {
      const response = await fetch("/api/live-presets");
      if (!response.ok) return;
      const data = await response.json() as { presets: LivePreset[] };
      setPresets(data.presets);
      setPresetsLoaded(true);
    } finally {
      setLoadingPresets(false);
    }
  }, []);

  function ensurePresetsLoaded() {
    if (!presetsLoaded && !loadingPresets) {
      void fetchPresets();
    }
  }

  async function handleSavePreset() {
    if (!presetName.trim()) return;
    setSaving(true);
    setPresetMessage(null);
    try {
      const response = await fetch("/api/live-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: presetName.trim(), ruleTree: toRuleTree() }),
      });
      if (!response.ok) throw new Error(pl.common.error);
      setPresetMessage(pl.liveScreener.presetSaved);
      setPresetName("");
      setSaveOpen(false);
      await fetchPresets();
    } catch {
      setPresetMessage(pl.common.error);
    } finally {
      setSaving(false);
    }
  }

  function handleLoadPreset(presetId: string) {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    loadDraft({ ruleTree: preset.ruleTree });
    setPresetMessage(null);
  }

  async function handleDeletePreset(presetId: string) {
    if (!confirm("Czy na pewno chcesz usunąć ten preset?")) return;
    try {
      const response = await fetch(`/api/live-presets/${presetId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      await fetchPresets();
    } catch {
      setPresetMessage(pl.common.error);
    }
  }

  if (root.type !== "GROUP") return null;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-[#848e9c]">AST Rule Builder</div>
          <div className="truncate text-xs text-[#eaecef]">Click any condition row to edit. Add condition opens the editor automatically.</div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <Select
            value=""
            onFocus={ensurePresetsLoaded}
            onChange={(e) => {
              ensurePresetsLoaded();
              if (e.target.value) handleLoadPreset(e.target.value);
            }}
            className="h-7 min-w-[120px] text-[10px]"
            disabled={loadingPresets}
          >
            <option value="">{pl.liveScreener.loadPreset}</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </Select>
          <Button type="button" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => { ensurePresetsLoaded(); setSaveOpen(true); }}>
            <Save className="mr-1 h-3.5 w-3.5" />
            {pl.liveScreener.savePreset}
          </Button>
          <Button type="button" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => { ensurePresetsLoaded(); setManageOpen(true); }}>
            <Settings2 className="mr-1 h-3.5 w-3.5" />
            Zarządzaj
          </Button>
          <Button type="button" variant="ghost" className="h-7 shrink-0 px-2 text-[10px]" onClick={() => setDebugOpen(true)}>
            <Code2 className="mr-1 h-3.5 w-3.5" />
            AST
          </Button>
        </div>
      </div>
      {presetMessage && <p className="text-[11px] text-[#2ebd85]">{presetMessage}</p>}
      {!loadingPresets && presetsLoaded && presets.length === 0 && (
        <p className="text-[11px] text-[#848e9c]">{pl.liveScreener.noPresets}</p>
      )}
      <RuleGroupBar node={root} />
      <Dialog.Root open={saveOpen} onOpenChange={setSaveOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 border border-[#2b3139] bg-[#0b0e11] p-4">
            <Dialog.Title className="mb-3 text-sm font-semibold text-[#eaecef]">
              {pl.liveScreener.savePreset}
            </Dialog.Title>
            <Input
              placeholder={pl.liveScreener.presetName}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)}>
                {pl.common.cancel}
              </Button>
              <Button type="button" disabled={saving || !presetName.trim()} onClick={() => void handleSavePreset()}>
                {saving ? pl.common.loading : pl.common.save}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={manageOpen} onOpenChange={setManageOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 border border-[#2b3139] bg-[#0b0e11] p-4">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-sm font-semibold text-[#eaecef]">Zarządzaj presetami</Dialog.Title>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" className="h-6 w-6 px-0">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {presets.length === 0 ? (
                <p className="text-[11px] text-[#848e9c]">Brak zapisanych presetów.</p>
              ) : (
                presets.map((preset) => (
                  <div key={preset.id} className="flex items-center justify-between rounded border border-[#1f2630] bg-[#11161c] px-2 py-1.5">
                    <span className="text-xs text-[#eaecef]">{preset.name}</span>
                    <Button type="button" variant="ghost" className="h-6 px-2 text-[10px] text-[#f6465d] hover:bg-[#2b161a] hover:text-[#f6465d]" onClick={() => void handleDeletePreset(preset.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={debugOpen} onOpenChange={setDebugOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
          <Dialog.Content className="fixed right-0 top-0 z-50 h-dvh w-full max-w-2xl border-l border-[#2b3139] bg-[#0b0e11] p-2">
            <div className="mb-2 flex items-center justify-between border-b border-[#1f2630] pb-2">
              <Dialog.Title className="text-xs font-semibold uppercase tracking-wide text-[#eaecef]">AST Debug</Dialog.Title>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" className="h-7 w-7 px-0">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <pre className="h-[calc(100dvh-64px)] overflow-auto bg-[#11161c] p-2 font-mono text-[11px] text-[#9af0ca]">
              {JSON.stringify(root, null, 2)}
            </pre>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
