import { describe, it, expect } from "vitest";
import { ccxtOhlcvToCandle } from "@/src/server/market-data/rolling-window-store";

describe("rolling window store helpers", () => {
  it("converts ccxt ohlcv row to candle", () => {
    const candle = ccxtOhlcvToCandle([1000, 10, 12, 9, 11, 500]);
    expect(candle.t).toBe(1000);
    expect(candle.c).toBe(11);
    expect(candle.closed).toBe(true);
  });
});
