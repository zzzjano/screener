import { describe, it, expect, beforeAll } from "vitest";
import {
  normalizeCompactSymbol,
  resolveCcxtLinearSymbol,
  toCompactSymbol,
} from "@/src/server/market-data/ccxt-client";
import ccxt, { type bybit } from "ccxt";

describe("ccxt symbol normalization", () => {
  const exchange = new ccxt.bybit({ options: { defaultType: "linear" } }) as bybit;

  beforeAll(() => {
    exchange.markets = {
      "BTC/USDT:USDT": {
        id: "BTCUSDT",
        symbol: "BTC/USDT:USDT",
        base: "BTC",
        quote: "USDT",
        linear: true,
        active: true,
      },
      "SOL/USDT:USDT": {
        id: "SOLUSDT",
        symbol: "SOL/USDT:USDT",
        base: "SOL",
        quote: "USDT",
        linear: true,
        active: true,
      },
    };
  });

  it("converts unified CCXT symbols to compact form", () => {
    expect(toCompactSymbol("BTC/USDT:USDT")).toBe("BTCUSDT");
    expect(toCompactSymbol("SOL/USDT:USDT")).toBe("SOLUSDT");
  });

  it("normalizes malformed stored symbols", () => {
    expect(normalizeCompactSymbol("SOLUSDT")).toBe("SOLUSDT");
    expect(normalizeCompactSymbol("SOLUSDT:USDT")).toBe("SOLUSDT");
    expect(normalizeCompactSymbol("SOL/USDT:USDT")).toBe("SOLUSDT");
  });

  it("resolves compact symbols to unified CCXT perpetual symbols", () => {
    expect(resolveCcxtLinearSymbol(exchange, "BTCUSDT")).toBe("BTC/USDT:USDT");
    expect(resolveCcxtLinearSymbol(exchange, "SOLUSDT")).toBe("SOL/USDT:USDT");
    expect(resolveCcxtLinearSymbol(exchange, "SOLUSDT:USDT")).toBe("SOL/USDT:USDT");
    expect(resolveCcxtLinearSymbol(exchange, "SOL/USDT:USDT")).toBe("SOL/USDT:USDT");
  });

  it("does not produce malformed symbols like SOLUSDT:/USDT:USDT", () => {
    const resolved = resolveCcxtLinearSymbol(exchange, "SOLUSDT:USDT");
    expect(resolved).toBe("SOL/USDT:USDT");
    expect(resolved).not.toContain(":/USDT:USDT");
  });
});
