import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  fetchLinearTickerMap,
  isUsdtLinearSwapMarket,
  listLinearUsdtMarkets,
  normalizeCompactSymbol,
  resolveCcxtLinearSymbol,
  toCompactSymbol,
  type CcxtMarketSession,
} from "@/src/server/market-data/ccxt-client";
import ccxt, { type bybit, type Market } from "ccxt";

function market(patch: Partial<Market>): Market {
  return {
    id: "BTCUSDT",
    symbol: "BTC/USDT:USDT",
    base: "BTC",
    quote: "USDT",
    settle: "USDT",
    linear: true,
    swap: true,
    active: true,
    ...patch,
  } as Market;
}

describe("ccxt symbol normalization", () => {
  const exchange = new ccxt.bybit({ options: { defaultType: "linear" } }) as bybit;

  beforeAll(() => {
    exchange.markets = {
      "BTC/USDT": market({
        id: "BTCUSDT",
        symbol: "BTC/USDT",
        base: "BTC",
        quote: "USDT",
        settle: undefined,
        linear: false,
        swap: false,
        active: true,
      }),
      "BTC/USDT:USDT": market({
        id: "BTCUSDT",
        symbol: "BTC/USDT:USDT",
        base: "BTC",
      }),
      "SOL/USDT:USDT": market({
        id: "SOLUSDT",
        symbol: "SOL/USDT:USDT",
        base: "SOL",
      }),
      "DOGE/USDT:USDT": market({
        id: "DOGEUSDT",
        symbol: "DOGE/USDT:USDT",
        base: "DOGE",
        settle: "USDC",
      }),
      "XRP/USD:XRP": market({
        id: "XRPUSD",
        symbol: "XRP/USD:XRP",
        base: "XRP",
        quote: "USD",
        settle: "XRP",
        linear: false,
        swap: true,
      }),
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

  it("strictly filters to active USDT-settled linear swaps", () => {
    expect(isUsdtLinearSwapMarket(exchange.markets["BTC/USDT:USDT"])).toBe(true);
    expect(isUsdtLinearSwapMarket(exchange.markets["BTC/USDT"])).toBe(false);
    expect(isUsdtLinearSwapMarket(exchange.markets["DOGE/USDT:USDT"])).toBe(false);
    expect(isUsdtLinearSwapMarket(exchange.markets["XRP/USD:XRP"])).toBe(false);

    expect(listLinearUsdtMarkets(exchange).map((entry) => entry.ccxtSymbol).sort()).toEqual([
      "BTC/USDT:USDT",
      "SOL/USDT:USDT",
    ]);
  });

  it("maps raw ticker ids only through the USDT linear swap session", async () => {
    exchange.fetchTickers = vi.fn(async () => ({
      BTCUSDT: { last: 100, quoteVolume: 1_000 },
      ETHUSDT: { last: 200, quoteVolume: 2_000 },
      "ETH/USDT": { last: 1, quoteVolume: 10 },
      "ETH/USDT:USDT": { last: 201, quoteVolume: 2_001 },
      XRPUSD: { last: 3, quoteVolume: 30 },
    })) as unknown as bybit["fetchTickers"];
    exchange.markets["ETH/USDT"] = market({
      id: "ETHUSDT",
      symbol: "ETH/USDT",
      base: "ETH",
      settle: undefined,
      linear: false,
      swap: false,
    });
    exchange.markets["ETH/USDT:USDT"] = market({
      id: "ETHUSDT",
      symbol: "ETH/USDT:USDT",
      base: "ETH",
    });

    const linearMarkets = listLinearUsdtMarkets(exchange);
    const session: CcxtMarketSession = {
      exchange,
      ccxtSymbolByCompact: new Map(linearMarkets.map((entry) => [entry.compact, entry.ccxtSymbol])),
      ccxtSymbolByMarketId: new Map(
        linearMarkets.flatMap((entry) => {
          const marketId = entry.market?.id;
          return marketId ? [[marketId.toUpperCase(), entry.ccxtSymbol]] : [];
        }),
      ),
    };

    const tickerMap = await fetchLinearTickerMap(session);

    expect(tickerMap.get("BTCUSDT")?.price).toBe(100);
    expect(tickerMap.get("ETHUSDT")?.price).toBe(201);
    expect(tickerMap.has("XRPUSD")).toBe(false);
  });
});
