import { describe, it, expect, vi } from "vitest";
import { validateRuleTree } from "@/src/server/rules/validator";
import { evaluateRuleTreeForScan, type ScanEvalContext } from "@/src/server/screeners/scan-evaluator";
import { InlineIndicatorExecutionEngine } from "@/src/server/indicators/indicator-execution-engine";
import type { Candle } from "@/src/server/indicators/indicator-types";

function candle(close: number, volume = 1000): Candle {
  return {
    t: Date.now(),
    T: Date.now(),
    o: close,
    h: close,
    l: close,
    c: close,
    v: volume,
    closed: true,
  };
}

function tickerContext(overrides: Partial<ScanEvalContext> = {}): ScanEvalContext {
  const loadCandles = vi.fn(async () => [] as Candle[]);
  return {
    symbol: "BTCUSDT",
    marketType: "LINEAR",
    ticker: { price: 100, volume24h: 50 },
    candlesByTf: new Map(),
    loadCandles,
    indicatorEngine: new InlineIndicatorExecutionEngine(),
    ...overrides,
  };
}

describe("evaluateRuleTreeForScan", () => {
  it("evaluates ticker-only rules without loading candles", async () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "c1",
            left: { kind: "PRICE", source: "CLOSE", timeframe: "1m" },
            comparator: "GT",
            right: { kind: "CONSTANT", value: 0 },
          },
        ],
      },
    });

    const ctx = tickerContext();
    const result = await evaluateRuleTreeForScan(tree, ctx);
    expect(result.passed).toBe(true);
    expect(ctx.loadCandles).not.toHaveBeenCalled();
  });

  it("short-circuits AND groups on cheap ticker failure before OHLCV", async () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "volume",
            left: { kind: "VOLUME", timeframe: "1m" },
            comparator: "GT",
            right: { kind: "CONSTANT", value: 1_000_000 },
          },
          {
            type: "CONDITION",
            id: "rsi",
            left: {
              kind: "INDICATOR",
              indicator: {
                id: "rsi-1",
                kind: "RSI",
                timeframe: "15m",
                source: "CLOSE",
                params: { period: 14 },
              },
            },
            comparator: "LT",
            right: { kind: "CONSTANT", value: 30 },
          },
        ],
      },
    });

    const ctx = tickerContext({ ticker: { price: 100, volume24h: 10 } });
    const result = await evaluateRuleTreeForScan(tree, ctx);
    expect(result.passed).toBe(false);
    expect(ctx.loadCandles).not.toHaveBeenCalled();
  });

  it("loads candles when indicator evaluation is required", async () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "rsi",
            left: {
              kind: "INDICATOR",
              indicator: {
                id: "rsi-1",
                kind: "RSI",
                timeframe: "15m",
                source: "CLOSE",
                params: { period: 2 },
              },
            },
            comparator: "LT",
            right: { kind: "CONSTANT", value: 90 },
          },
        ],
      },
    });

    const closes = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11];
    const ctx = tickerContext({
      loadCandles: vi.fn(async () => closes.map((value) => candle(value))),
    });

    const result = await evaluateRuleTreeForScan(tree, ctx);
    expect(result.passed).toBe(true);
    expect(ctx.loadCandles).toHaveBeenCalledWith("15m");
  });
});
