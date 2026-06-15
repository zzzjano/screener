"use client";

import type { RuleNode } from "@/src/server/rules/ast";
import { pl } from "@/src/lib/i18n/pl";
import { Button } from "@/src/components/ui";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import { ConditionRow } from "./condition-row";
import { CompactRuleBuilder } from "./compact-rule-builder";

export function GroupNode({ node, depth = 0 }: { node: Extract<RuleNode, { type: "GROUP" }>; depth?: number }) {
  const addCondition = useBuilderStore((s) => s.addCondition);
  const addGroup = useBuilderStore((s) => s.addGroup);
  const root = useBuilderStore((s) => s.root);

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4" style={{ marginLeft: depth * 12 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-zinc-300">
          {pl.queryBuilder.group} ({node.operator === "AND" ? pl.queryBuilder.allConditions : pl.queryBuilder.anyCondition})
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => addCondition(node.id)}>
            {pl.queryBuilder.addCondition}
          </Button>
          <Button type="button" variant="ghost" onClick={() => addGroup(node.id)}>
            {pl.queryBuilder.addGroup}
          </Button>
        </div>
      </div>
      {node.children.map((child) =>
        child.type === "GROUP" ? (
          <GroupNode key={child.id} node={child} depth={depth + 1} />
        ) : (
          <ConditionRow key={child.id} node={child} />
        ),
      )}
      {node.id === "root" && <RulePreviewPl root={root} />}
    </div>
  );
}

function RulePreviewPl({ root }: { root: RuleNode }) {
  return (
    <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-sm text-emerald-200">
      <div className="mb-1 font-medium">{pl.queryBuilder.preview}</div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-emerald-100/80">
        {JSON.stringify(root, null, 2)}
      </pre>
    </div>
  );
}

export function QueryBuilder() {
  return <CompactRuleBuilder />;
}
