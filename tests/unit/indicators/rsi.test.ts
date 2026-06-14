import { describe, it, expect } from "vitest";
import { calcRsi, calcEma } from "@/src/server/indicators/calculators/rsi";
import type { Candle } from "@/src/server/indicators/indicator-types";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    t: i * 60_000,
    T: (i + 1) * 60_000,
    o: c,
    h: c + 1,
    l: c - 1,
    c,
    v: 1000,
    closed: true,
  }));
}

describe("indicators", () => {
  it("calculates RSI for trending data", () => {
    const candles = makeCandles(Array.from({ length: 30 }, (_, i) => 100 + i));
    const rsi = calcRsi(candles, 14);
    expect(rsi.length).toBeGreaterThan(0);
    expect(rsi[rsi.length - 1]).toBeGreaterThan(50);
  });

  it("calculates EMA", () => {
    const candles = makeCandles(Array.from({ length: 30 }, (_, i) => 100 + i));
    const ema = calcEma(candles, 10);
    expect(ema.length).toBeGreaterThan(0);
  });
});
