"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Code2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/src/components/ui";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import { RuleGroupBar } from "./rule-group-bar";

export function CompactRuleBuilder() {
  const [debugOpen, setDebugOpen] = useState(false);
  const root = useBuilderStore((s) => s.root);

  if (root.type !== "GROUP") return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#848e9c]">AST Rule Builder</div>
          <div className="text-xs text-[#eaecef]">Compact filters, drawer-based advanced edits</div>
        </div>
        <Button type="button" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setDebugOpen(true)}>
          <Code2 className="mr-1 h-3.5 w-3.5" />
          AST
        </Button>
      </div>
      <RuleGroupBar node={root} />
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
