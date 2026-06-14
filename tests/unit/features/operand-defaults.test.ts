import { describe, it, expect } from "vitest";
import {
  createConstantOperand,
  createIndicatorOperand,
  createMarketOperand,
  defaultIndicatorParams,
  getIndicatorKind,
  getMarketField,
  getOperandCategory,
} from "@/src/features/screeners/components/operand-defaults";

describe("operand defaults", () => {
  it("creates market operands", () => {
    const close = createMarketOperand("close", "15m");
    expect(close).toEqual({ kind: "PRICE", source: "CLOSE", timeframe: "15m" });

    const volume = createMarketOperand("volume", "1h");
    expect(volume).toEqual({ kind: "VOLUME", timeframe: "1h" });
  });

  it("creates indicator operands with defaults", () => {
    const rsi = createIndicatorOperand("RSI", "15m");
    expect(getOperandCategory(rsi)).toBe("indicator");
    expect(rsi.kind === "INDICATOR" && rsi.indicator.params).toEqual({ period: 14 });

    const ema = createIndicatorOperand("EMA", "1h");
    expect(ema.kind === "INDICATOR" && ema.indicator.params).toEqual({ period: 50 });

    const macd = createIndicatorOperand("MACD", "15m");
    expect(macd.kind === "INDICATOR" && macd.indicator.params).toEqual({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    });
  });

  it("creates constant operand", () => {
    const constant = createConstantOperand(42);
    expect(getOperandCategory(constant)).toBe("constant");
    expect(constant).toEqual({ kind: "CONSTANT", value: 42 });
  });

  it("reads operand categories and market fields", () => {
    const indicator = createIndicatorOperand("SMA", "15m");
    expect(getIndicatorKind(indicator)).toBe("SMA");
    expect(getMarketField(createMarketOperand("volume", "15m"))).toBe("volume");
    expect(defaultIndicatorParams("RSI")).toEqual({ period: 14 });
  });
});
