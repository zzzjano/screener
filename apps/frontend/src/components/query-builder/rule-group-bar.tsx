"use client";

import { useState } from "react";
import { Plus, Rows3 } from "lucide-react";
import type { RuleNode } from "@screener/shared-types";
import { Button } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import { RuleConditionChip } from "./rule-condition-chip";

export function RuleGroupBar({
  node,
  depth = 0,
}: {
  node: Extract<RuleNode, { type: "GROUP" }>;
  depth?: number;
}) {
  const addCondition = useBuilderStore((s) => s.addCondition);
  const addGroup = useBuilderStore((s) => s.addGroup);
  const updateGroupOperator = useBuilderStore((s) => s.updateGroupOperator);
  const [openConditionId, setOpenConditionId] = useState<string | null>(null);

  function addAndEditCondition() {
    const id = addCondition(node.id);
    setOpenConditionId(id);
  }

  return (
    <div className="min-w-0 space-y-1 border-l border-[#2b3139] pl-1" style={{ marginLeft: depth * 4 }}>
      <div className="flex min-h-7 flex-wrap items-center gap-1">
        <div className="flex border border-[#2b3139] bg-[#0b0e11]">
          {(["AND", "OR"] as const).map((operator) => (
            <button
              key={operator}
              type="button"
              onClick={() => updateGroupOperator(node.id, operator)}
              className={cn(
                "px-2 py-1 font-mono text-[10px] uppercase text-[#848e9c]",
                node.operator === operator && "bg-[#2b3139] text-[#eaecef]",
              )}
            >
              {operator === "AND" ? "ALL" : "ANY"}
            </button>
          ))}
        </div>
        <Button type="button" variant="secondary" className="h-7 px-2 text-[11px]" onClick={addAndEditCondition}>
          <Plus className="mr-1 h-3 w-3" />
          Add condition
        </Button>
        <Button type="button" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => addGroup(node.id)}>
          <Rows3 className="mr-1 h-3 w-3" />
          Add group
        </Button>
      </div>
      <div className="space-y-1">
        {node.children.map((child) =>
          child.type === "GROUP" ? (
            <RuleGroupBar key={child.id} node={child} depth={depth + 1} />
          ) : (
            <RuleConditionChip
              key={child.id}
              node={child}
              initiallyOpen={child.id === openConditionId}
            />
          ),
        )}
      </div>
    </div>
  );
}
