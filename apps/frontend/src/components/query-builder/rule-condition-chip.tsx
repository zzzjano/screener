"use client";

import { useState } from "react";
import { Settings2, Trash2 } from "lucide-react";
import type { ConditionNode } from "@screener/shared-types";
import { Button } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import { ConditionEditorDrawer } from "./condition-editor-drawer";
import { OperandPill } from "./operand-pill";

export function RuleConditionChip({
  node,
  initiallyOpen = false,
}: {
  node: ConditionNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const removeNode = useBuilderStore((s) => s.removeNode);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="group flex min-h-9 min-w-0 w-full items-center gap-1 border border-[#1f2630] bg-[#11161c] px-1.5 py-1 text-left hover:border-[#2b3139] hover:bg-[#161b22] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#f0b90b]"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="shrink-0 mr-1 text-[10px] uppercase tracking-wide text-[#848e9c]">If</span>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <OperandPill operand={node.left} />
          <span className="shrink-0 border border-[#2b3139] bg-[#0b0e11] px-1.5 py-0.5 font-mono text-[11px] text-[#f0b90b]">
            {formatComparator(node.comparator)}
          </span>
          <OperandPill operand={node.right} />
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1 opacity-90 group-hover:opacity-100">
          <span className="inline-flex h-7 items-center border border-[#2b3139] px-1.5 text-[11px] font-semibold text-[#eaecef] sm:px-2">
            <Settings2 className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Edit</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-1.5 text-[11px] text-[#f6465d] sm:px-2"
            onClick={(event) => {
              event.stopPropagation();
              removeNode(node.id);
            }}
            aria-label="Remove condition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </Button>
        </span>
      </div>
      <ConditionEditorDrawer node={node} open={open} onOpenChange={setOpen} />
    </>
  );
}

function formatComparator(comparator: ConditionNode["comparator"]) {
  const label = pl.comparators[comparator];
  if (comparator === "GT") return ">";
  if (comparator === "GTE") return ">=";
  if (comparator === "LT") return "<";
  if (comparator === "LTE") return "<=";
  if (comparator === "EQ") return "=";
  if (comparator === "NEQ") return "!=";
  return label;
}
