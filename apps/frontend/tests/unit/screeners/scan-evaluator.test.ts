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
    isTickerOnlyScan: true,
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

  it("uses timeframe candle volume instead of 24h ticker volume", async () => {
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
            right: { kind: "CONSTANT", value: 1_000 },
          },
        ],
      },
    });

    const ctx = tickerContext({
      ticker: { price: 100, volume24h: 1_000_000 },
      loadCandles: vi.fn(async () => [candle(100, 10)]),
    });
    const result = await evaluateRuleTreeForScan(tree, ctx);
    expect(result.passed).toBe(false);
    expect(ctx.loadCandles).toHaveBeenCalledWith("1m");
  });

  it("evaluates TICKER_VOLUME from ticker snapshot without loading candles", async () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "volume24h",
            left: { kind: "TICKER_VOLUME" },
            comparator: "GT",
            right: { kind: "CONSTANT", value: 1_000 },
          },
        ],
      },
    });

    const ctx = tickerContext({ ticker: { price: 100, volume24h: 5_000 } });
    const result = await evaluateRuleTreeForScan(tree, ctx);
    expect(result.passed).toBe(true);
    expect(ctx.loadCandles).not.toHaveBeenCalled();
    expect(result.snapshots[0]?.leftValue).toBe(5_000);
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
      isTickerOnlyScan: false,
      loadCandles: vi.fn(async () => closes.map((value) => candle(value))),
    });

    const result = await evaluateRuleTreeForScan(tree, ctx);
    expect(result.passed).toBe(true);
    expect(ctx.loadCandles).toHaveBeenCalledWith("15m");
  });

  it("loads separate timeframe candles for mixed MTF price and indicator rules", async () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "rsi-15m",
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
          {
            type: "CONDITION",
            id: "close-1h",
            left: { kind: "PRICE", source: "CLOSE", timeframe: "1h" },
            comparator: "GT",
            right: { kind: "CONSTANT", value: 100 },
          },
        ],
      },
    });

    const loadCandles = vi.fn(async (timeframe: string) => {
      if (timeframe === "1h") return [candle(200)];
      if (timeframe === "15m") {
        return [20, 19, 18, 17, 16, 15, 14, 13, 12, 11].map((value) => candle(value));
      }
      return [];
    });
    const ctx = tickerContext({
      isTickerOnlyScan: false,
      ticker: { price: 1, volume24h: 50 },
      loadCandles,
    });

    const result = await evaluateRuleTreeForScan(tree, ctx);
    expect(result.passed).toBe(true);
    expect(loadCandles).toHaveBeenCalledWith("1h");
    expect(loadCandles).toHaveBeenCalledWith("15m");
    expect(result.snapshots.find((snapshot) => snapshot.nodeId === "close-1h")?.leftValue).toBe(200);
  });

  it("evaluates private position operands through resolver", async () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "position-pnl",
            left: { kind: "POSITION", field: "PNL_PCT", symbolScope: "CURRENT_SYMBOL" },
            comparator: "LT",
            right: { kind: "CONSTANT", value: -10 },
          },
        ],
      },
    });

    const getPositionMetric = vi.fn(async () => ({ current: -12.5 }));
    const result = await evaluateRuleTreeForScan(tree, tickerContext({ getPositionMetric }));
    expect(result.passed).toBe(true);
    expect(getPositionMetric).toHaveBeenCalledWith("BTCUSDT", expect.objectContaining({ kind: "POSITION" }));
  });

  it("fails private operands without private context instead of crashing", async () => {
    const tree = validateRuleTree({
      version: 1,
      root: {
        type: "GROUP",
        id: "root",
        operator: "AND",
        children: [
          {
            type: "CONDITION",
            id: "has-position",
            left: { kind: "POSITION", field: "HAS_ACTIVE_POSITION", symbolScope: "CURRENT_SYMBOL" },
            comparator: "EQ",
            right: { kind: "CONSTANT", value: 1 },
          },
        ],
      },
    });

    const result = await evaluateRuleTreeForScan(tree, tickerContext());
    expect(result.passed).toBe(false);
  });
});
