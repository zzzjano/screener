import { describe, it, expect, vi, beforeEach } from "vitest";
import ccxt, { type bybit } from "ccxt";

describe("ensureMarketsLoaded null guard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("does not throw when exchange.markets is undefined before loadMarkets", async () => {
    const { ensureMarketsLoaded } = await import("@/src/server/market-data/ccxt-client");
    const exchange = new ccxt.bybit({ options: { defaultType: "linear" } }) as bybit;
    delete (exchange as { markets?: unknown }).markets;

    exchange.loadMarkets = vi.fn(async () => {
      exchange.markets = {
        "BTC/USDT:USDT": {
          id: "BTCUSDT",
          symbol: "BTC/USDT:USDT",
          base: "BTC",
          quote: "USDT",
          linear: true,
          active: true,
        },
      };
    });

    await expect(ensureMarketsLoaded(exchange)).resolves.toBeUndefined();
    expect(exchange.loadMarkets).toHaveBeenCalledOnce();
  });

  it("resolveCcxtLinearSymbol handles undefined markets", async () => {
    const { resolveCcxtLinearSymbol } = await import("@/src/server/market-data/ccxt-client");
    const exchange = new ccxt.bybit({ options: { defaultType: "linear" } }) as bybit;
    delete (exchange as { markets?: unknown }).markets;

    expect(resolveCcxtLinearSymbol(exchange, "BTCUSDT")).toBeNull();
  });
});
