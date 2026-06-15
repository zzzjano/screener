"use client";

import { useState } from "react";
import { Settings2, Trash2 } from "lucide-react";
import type { ConditionNode } from "@/src/server/rules/ast";
import { Button } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import { ConditionEditorDrawer } from "./condition-editor-drawer";
import { OperandPill } from "./operand-pill";

export function RuleConditionChip({ node }: { node: ConditionNode }) {
  const [open, setOpen] = useState(false);
  const removeNode = useBuilderStore((s) => s.removeNode);

  return (
    <>
      <div className="group flex min-h-8 items-center gap-1 border border-[#1f2630] bg-[#11161c] px-1 py-1 hover:border-[#2b3139]">
        <OperandPill operand={node.left} />
        <span className="border border-[#2b3139] bg-[#0b0e11] px-1.5 py-0.5 font-mono text-[11px] text-[#f0b90b]">
          {formatComparator(node.comparator)}
        </span>
        <OperandPill operand={node.right} />
        <div className="ml-auto flex items-center gap-1 opacity-80 group-hover:opacity-100">
          <Button type="button" variant="ghost" className="h-6 w-6 px-0" onClick={() => setOpen(true)} aria-label="Edit condition">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" className="h-6 w-6 px-0 text-[#f6465d]" onClick={() => removeNode(node.id)} aria-label="Remove condition">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
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
