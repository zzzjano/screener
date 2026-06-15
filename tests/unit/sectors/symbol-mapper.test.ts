import { describe, expect, it } from "vitest";
import { bybitBaseFromSymbol, inferSectorTags, mapCoinGeckoIdForBybitSymbol } from "@/src/server/sectors/symbol-mapper";

describe("CoinGecko symbol mapper", () => {
  it("normalizes Bybit symbols to base assets", () => {
    expect(bybitBaseFromSymbol("BTCUSDT")).toBe("BTC");
    expect(bybitBaseFromSymbol("ETH/USDT:USDT")).toBe("ETH");
  });

  it("maps market-cap ranked CoinGecko ids for ambiguous symbols", () => {
    const id = mapCoinGeckoIdForBybitSymbol("TONUSDT", [
      { id: "tiny-ton", symbol: "ton", name: "Tiny", market_cap_rank: 900 },
      { id: "the-open-network", symbol: "ton", name: "Toncoin", market_cap_rank: 20 },
    ]);
    expect(id).toBe("the-open-network");
  });

  it("handles Bybit 1000-token aliases", () => {
    const id = mapCoinGeckoIdForBybitSymbol("1000PEPEUSDT", [
      { id: "pepe", symbol: "pepe", name: "Pepe", market_cap_rank: 50 },
    ]);
    expect(id).toBe("pepe");
  });

  it("infers coarse narrative tags", () => {
    expect(inferSectorTags("pepe")).toContain("Meme");
    expect(inferSectorTags("bittensor")).toContain("AI");
  });
});
