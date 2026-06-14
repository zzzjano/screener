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
