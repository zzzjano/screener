"use client";

import type { RuleNode } from "@/src/server/rules/ast";
import { pl } from "@/src/lib/i18n/pl";
import { Button, Input, Select } from "@/src/components/ui";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";

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

function ConditionRow({ node }: { node: Extract<RuleNode, { type: "CONDITION" }> }) {
  const updateCondition = useBuilderStore((s) => s.updateCondition);
  const removeNode = useBuilderStore((s) => s.removeNode);

  return (
    <div className="grid gap--2 rounded-lg border border-zinc-800 p-3 md:grid-cols-4">
      <Select
        value={node.left.kind === "INDICATOR" ? node.left.indicator.kind : "PRICE"}
        onChange={(e) =>
          updateCondition(node.id, {
            left: {
              kind: "INDICATOR",
              indicator: {
                id: node.left.kind === "INDICATOR" ? node.left.indicator.id : `ind-${node.id}`,
                kind: e.target.value as "RSI",
                timeframe: "15m",
                source: "CLOSE",
                params: { period: 14 },
              },
            },
          })
        }
      >
        <option value="RSI">{pl.indicators.RSI}</option>
        <option value="EMA">{pl.indicators.EMA}</option>
        <option value="SMA">{pl.indicators.SMA}</option>
        <option value="MACD">{pl.indicators.MACD}</option>
      </Select>
      <Select
        value={node.comparator}
        onChange={(e) => updateCondition(node.id, { comparator: e.target.value as typeof node.comparator })}
      >
        <option value="LT">{pl.comparators.LT}</option>
        <option value="GT">{pl.comparators.GT}</option>
        <option value="CROSSES_ABOVE">{pl.comparators.CROSSES_ABOVE}</option>
        <option value="CROSSES_BELOW">{pl.comparators.CROSSES_BELOW}</option>
      </Select>
      <Input
        type="number"
        value={node.right.kind === "CONSTANT" ? node.right.value : 0}
        onChange={(e) =>
          updateCondition(node.id, {
            right: { kind: "CONSTANT", value: Number(e.target.value) },
          })
        }
      />
      <Button type="button" variant="danger" onClick={() => removeNode(node.id)}>
        {pl.queryBuilder.remove}
      </Button>
    </div>
  );
}

function RulePreviewPl({ root }: { root: RuleNode }) {
  return (
    <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-sm text-emerald-200">
      <div className="mb-1 font-medium">{pl.queryBuilder.preview}</div>
      <pre className="whitespace-pre-wrap text-xs text-emerald-100/80">{JSON.stringify(root, null, 2)}</pre>
    </div>
  );
}

export function QueryBuilder() {
  const root = useBuilderStore((s) => s.root);
  if (root.type !== "GROUP") return null;
  return <GroupNode node={root} />;
}
