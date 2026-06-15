import { z } from "zod";

export const AST_VERSION = 1;

export const comparatorSchema = z.enum([
  "LT",
  "LTE",
  "GT",
  "GTE",
  "EQ",
  "NEQ",
  "BETWEEN",
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "PERCENT_CHANGE_GT",
  "PERCENT_CHANGE_LT",
  "VOLUME_SPIKE",
]);

export const operandKindSchema = z.enum([
  "PRICE",
  "VOLUME",
  "MARKET_FIELD",
  "INDICATOR",
  "CONSTANT",
  "OPEN_INTEREST",
  "FUNDING_RATE",
  "LIQUIDATION",
  "SECTOR",
  "PORTFOLIO",
  "POSITION",
]);

export const priceSourceSchema = z.enum([
  "OPEN",
  "HIGH",
  "LOW",
  "CLOSE",
  "HL2",
  "HLC3",
  "OHLC4",
]);

export const indicatorKindSchema = z.enum([
  "RSI",
  "SMA",
  "EMA",
  "MACD",
  "BOLLINGER_BANDS",
  "ATR",
  "ADX",
  "STOCH_RSI",
  "VWAP",
  "OBV",
  "MFI",
  "ROC",
  "CCI",
  "CUSTOM",
]);

export const indicatorConfigSchema = z.object({
  id: z.string(),
  kind: indicatorKindSchema,
  timeframe: z.string(),
  source: priceSourceSchema.default("CLOSE"),
  params: z.record(z.string(), z.unknown()).default({}),
  outputField: z.string().optional(),
});

export const operandSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("PRICE"),
    source: priceSourceSchema.default("CLOSE"),
    timeframe: z.string(),
  }),
  z.object({
    kind: z.literal("VOLUME"),
    timeframe: z.string(),
  }),
  z.object({
    kind: z.literal("MARKET_FIELD"),
    field: z.string(),
    timeframe: z.string(),
  }),
  z.object({
    kind: z.literal("INDICATOR"),
    indicator: indicatorConfigSchema,
  }),
  z.object({
    kind: z.literal("CONSTANT"),
    value: z.number(),
    valueMax: z.number().optional(),
  }),
  z.object({
    kind: z.literal("OPEN_INTEREST"),
    timeframe: z.string().default("15m"),
    transform: z.enum(["CURRENT", "PERCENT_CHANGE"]).default("CURRENT"),
    lookbackBars: z.number().int().positive().optional(),
  }),
  z.object({
    kind: z.literal("FUNDING_RATE"),
  }),
  z.object({
    kind: z.literal("LIQUIDATION"),
    side: z.enum(["BUY", "SELL", "NET"]),
    timeframe: z.string(),
    transform: z.enum(["SUM", "PERCENT_CHANGE"]).default("SUM"),
  }),
  z.object({
    kind: z.literal("SECTOR"),
    tags: z.array(z.string()).min(1),
    match: z.enum(["IN", "NOT_IN"]).default("IN"),
  }),
  z.object({
    kind: z.literal("PORTFOLIO"),
    field: z.enum(["TOTAL_EQUITY", "AVAILABLE_BALANCE", "MARGIN_USAGE_PCT"]),
  }),
  z.object({
    kind: z.literal("POSITION"),
    field: z.enum(["PNL_PCT", "SIDE", "HAS_ACTIVE_POSITION", "LEVERAGE", "NOTIONAL"]),
    symbolScope: z.enum(["CURRENT_SYMBOL", "ANY"]).default("CURRENT_SYMBOL"),
    side: z.enum(["LONG", "SHORT"]).optional(),
  }),
]);

export const conditionNodeSchema = z.object({
  type: z.literal("CONDITION"),
  id: z.string(),
  left: operandSchema,
  comparator: comparatorSchema,
  right: operandSchema,
  params: z.record(z.string(), z.unknown()).optional(),
});

export type RuleNode =
  | z.infer<typeof conditionNodeSchema>
  | {
      type: "GROUP";
      id: string;
      operator: "AND" | "OR";
      negate?: boolean;
      children: RuleNode[];
    };

export const ruleNodeSchema: z.ZodType<RuleNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    conditionNodeSchema,
    z.object({
      type: z.literal("GROUP"),
      id: z.string(),
      operator: z.enum(["AND", "OR"]),
      negate: z.boolean().optional(),
      children: z.array(ruleNodeSchema),
    }),
  ]),
);

export const ruleTreeSchema = z.object({
  version: z.literal(AST_VERSION),
  root: ruleNodeSchema,
});

export type Comparator = z.infer<typeof comparatorSchema>;
export type Operand = z.infer<typeof operandSchema>;
export type ConditionNode = z.infer<typeof conditionNodeSchema>;
export type RuleTree = z.infer<typeof ruleTreeSchema>;
export type IndicatorConfigAst = z.infer<typeof indicatorConfigSchema>;

export interface ScreenerDependency {
  symbols: string[];
  timeframes: string[];
  indicators: IndicatorConfigAst[];
  maxWarmupBars: number;
}
