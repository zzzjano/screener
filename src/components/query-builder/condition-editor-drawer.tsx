"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ConditionNode } from "@/src/server/rules/ast";
import { Button } from "@/src/components/ui";
import { ConditionRow } from "./condition-row";

export function ConditionEditorDrawer({
  node,
  open,
  onOpenChange,
}: {
  node: ConditionNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-dvh w-full max-w-xl border-l border-[#2b3139] bg-[#0b0e11] p-2 shadow-2xl">
          <div className="mb-2 flex items-center justify-between border-b border-[#1f2630] pb-2">
            <div>
              <Dialog.Title className="text-xs font-semibold uppercase tracking-wide text-[#eaecef]">
                Edit condition
              </Dialog.Title>
              <Dialog.Description className="text-[10px] text-[#848e9c]">
                Change operands, timeframe, operator and indicator settings. Changes apply immediately.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" className="h-7 w-7 px-0">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <ConditionRow node={node} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
