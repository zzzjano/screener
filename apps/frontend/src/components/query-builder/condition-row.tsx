"use client";

import type { Comparator, ConditionNode, Operand, Timeframe } from "@screener/shared-types";
import { pl } from "@/src/lib/i18n/pl";
import { Button, Input, Select } from "@/src/components/ui";
import { useBuilderStore } from "@/src/features/screeners/components/builder-store";
import {
  UI_COMPARATORS,
  createConstantOperand,
  createDerivativeOperand,
  createIndicatorOperand,
  createMarketOperand,
  createPrivateOperand,
  createSectorOperand,
  getDerivativeField,
  getIndicatorKind,
  getMarketField,
  getOperandCategory,
  getOperandTimeframe,
  getPrivateField,
  updateIndicatorParams,
  type UiIndicatorKind,
  type UiDerivativeField,
  type UiMarketField,
  type UiOperandCategory,
  type UiPrivateField,
} from "@/src/features/screeners/components/operand-defaults";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];
const INDICATORS: UiIndicatorKind[] = ["RSI", "EMA", "SMA", "MACD"];
const DERIVATIVES: UiDerivativeField[] = ["fundingRate", "openInterest", "liquidationNet"];
const PRIVATE_FIELDS: UiPrivateField[] = ["positionPnl", "hasPosition", "positionSide", "totalEquity", "marginUsage"];

interface ConditionRowProps {
  node: ConditionNode;
}

export function ConditionRow({ node }: ConditionRowProps) {
  const updateCondition = useBuilderStore((s) => s.updateCondition);
  const removeNode = useBuilderStore((s) => s.removeNode);
  const defaultTimeframe = useBuilderStore((s) => s.timeframes[0] ?? "15m");

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {pl.queryBuilder.condition}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <OperandEditor
          label={pl.queryBuilder.leftOperand}
          operand={node.left}
          allowConstant={false}
          defaultTimeframe={defaultTimeframe}
          onChange={(left) => updateCondition(node.id, { left })}
        />

        <div className="min-w-[140px] flex-1 space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">
            {pl.queryBuilder.comparator}
          </label>
          <Select
            value={node.comparator}
            onChange={(e) =>
              updateCondition(node.id, { comparator: e.target.value as Comparator })
            }
          >
            {UI_COMPARATORS.map((cmp) => (
              <option key={cmp} value={cmp}>
                {pl.comparators[cmp]}
              </option>
            ))}
          </Select>
        </div>

        <OperandEditor
          label={pl.queryBuilder.rightOperand}
          operand={node.right}
          allowConstant
          defaultTimeframe={defaultTimeframe}
          onChange={(right) => updateCondition(node.id, { right })}
        />

        <Button type="button" variant="danger" onClick={() => removeNode(node.id)}>
          {pl.queryBuilder.remove}
        </Button>
      </div>
    </div>
  );
}

function OperandEditor({
  label,
  operand,
  allowConstant,
  defaultTimeframe,
  onChange,
}: {
  label: string;
  operand: Operand;
  allowConstant: boolean;
  defaultTimeframe: string;
  onChange: (operand: Operand) => void;
}) {
  const category = getOperandCategory(operand);
  const timeframe = getOperandTimeframe(operand, defaultTimeframe);

  function setCategory(next: UiOperandCategory) {
    if (next === "constant") {
      onChange(createConstantOperand(operand.kind === "CONSTANT" ? operand.value : 0));
      return;
    }
    if (next === "market") {
      onChange(createMarketOperand("close", timeframe));
      return;
    }
    if (next === "derivative") {
      onChange(createDerivativeOperand("fundingRate", timeframe));
      return;
    }
    if (next === "sector") {
      onChange(createSectorOperand());
      return;
    }
    if (next === "private") {
      onChange(createPrivateOperand("positionPnl"));
      return;
    }
    onChange(
      createIndicatorOperand(
        operand.kind === "INDICATOR" ? getIndicatorKind(operand) : "RSI",
        timeframe,
        operand.kind === "INDICATOR" ? operand.indicator.id : undefined,
      ),
    );
  }

  return (
    <div className="min-w-[220px] flex-[2] space-y-1 rounded-md border border-zinc-800/80 bg-zinc-900/40 p-2">
      <label className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</label>

      <Select
        value={category}
        onChange={(e) => setCategory(e.target.value as UiOperandCategory)}
      >
        <option value="market">{pl.queryBuilder.marketField}</option>
        <option value="indicator">{pl.queryBuilder.indicator}</option>
        <option value="derivative">Derivatives</option>
        <option value="sector">Sector</option>
        <option value="private">Portfolio</option>
        {allowConstant && <option value="constant">{pl.queryBuilder.constant}</option>}
      </Select>

      {category === "market" && (
        <Select
          value={getMarketField(operand)}
          onChange={(e) =>
            onChange(createMarketOperand(e.target.value as UiMarketField, timeframe))
          }
        >
          <option value="close">{pl.queryBuilder.closePrice}</option>
          <option value="volume">{pl.queryBuilder.volume}</option>
          <option value="volume24h">{pl.queryBuilder.volume24h}</option>
        </Select>
      )}

      {category === "indicator" && operand.kind === "INDICATOR" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Select
              value={operand.indicator.kind}
              onChange={(e) =>
                onChange(
                  createIndicatorOperand(
                    e.target.value as UiIndicatorKind,
                    operand.indicator.timeframe,
                    operand.indicator.id,
                  ),
                )
              }
              className="min-w-[90px] flex-1"
            >
              {INDICATORS.map((kind) => (
                <option key={kind} value={kind}>
                  {pl.indicators[kind]}
                </option>
              ))}
            </Select>
            <Select
              value={operand.indicator.timeframe}
              onChange={(e) =>
                onChange({
                  ...operand,
                  indicator: { ...operand.indicator, timeframe: e.target.value as Timeframe },
                })
              }
              className="min-w-[72px] flex-1"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </Select>
          </div>
          <IndicatorParams
            kind={operand.indicator.kind as UiIndicatorKind}
            params={operand.indicator.params}
            onChange={(params) =>
              onChange({
                ...operand,
                indicator: updateIndicatorParams(operand.indicator, params),
              })
            }
          />
        </div>
      )}

      {category === "constant" && operand.kind === "CONSTANT" && (
        <Input
          type="number"
          step="any"
          value={operand.value}
          onChange={(e) => onChange({ kind: "CONSTANT", value: Number(e.target.value) })}
          placeholder={pl.queryBuilder.constant}
        />
      )}

      {category === "derivative" && (
        <div className="flex flex-wrap gap-2">
          <Select
            value={getDerivativeField(operand)}
            onChange={(e) =>
              onChange(createDerivativeOperand(e.target.value as UiDerivativeField, timeframe))
            }
            className="min-w-[130px] flex-1"
          >
            {DERIVATIVES.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </Select>
          {operand.kind !== "FUNDING_RATE" && (
            <Select
              value={timeframe}
              onChange={(e) =>
                onChange(createDerivativeOperand(getDerivativeField(operand), e.target.value as Timeframe))
              }
              className="min-w-[72px] flex-1"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}

      {category === "sector" && operand.kind === "SECTOR" && (
        <Input
          value={operand.tags.join(", ")}
          onChange={(e) =>
            onChange(
              createSectorOperand(
                e.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              ),
            )
          }
          placeholder="AI, Meme, L1"
        />
      )}

      {category === "private" && (
        <Select
          value={getPrivateField(operand)}
          onChange={(e) => onChange(createPrivateOperand(e.target.value as UiPrivateField))}
        >
          {PRIVATE_FIELDS.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </Select>
      )}

      {category === "market" && operand.kind !== "TICKER_VOLUME" && (
        <Select
          value={timeframe}
          onChange={(e) => {
            onChange(createMarketOperand(getMarketField(operand), e.target.value as Timeframe));
          }}
          className="text-xs"
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf} value={tf}>
              {pl.queryBuilder.timeframe}: {tf}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}

function IndicatorParams({
  kind,
  params,
  onChange,
}: {
  kind: UiIndicatorKind;
  params: Record<string, unknown>;
  onChange: (patch: Record<string, number>) => void;
}) {
  if (kind === "MACD") {
    return (
      <div className="flex flex-wrap gap-2">
        <ParamInput
          label={pl.queryBuilder.fast}
          value={Number(params.fastPeriod ?? 12)}
          onChange={(v) => onChange({ fastPeriod: v })}
        />
        <ParamInput
          label={pl.queryBuilder.slow}
          value={Number(params.slowPeriod ?? 26)}
          onChange={(v) => onChange({ slowPeriod: v })}
        />
        <ParamInput
          label={pl.queryBuilder.signal}
          value={Number(params.signalPeriod ?? 9)}
          onChange={(v) => onChange({ signalPeriod: v })}
        />
      </div>
    );
  }

  return (
    <ParamInput
      label={pl.queryBuilder.period}
      value={Number(params.period ?? (kind === "RSI" ? 14 : 50))}
      onChange={(v) => onChange({ period: v })}
    />
  );
}

function ParamInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex min-w-[72px] flex-1 flex-col gap-0.5 text-[10px] text-zinc-500">
      {label}
      <Input
        type="number"
        min={1}
        step={1}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 px-2 py-1 text-xs"
      />
    </label>
  );
}
