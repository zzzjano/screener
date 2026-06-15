import { MarketType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { fetchCoinGeckoMarkets } from "./coingecko-client";
import { inferSectorTags, mapCoinGeckoIdForBybitSymbol } from "./symbol-mapper";

export async function syncCoinGeckoSectors(): Promise<{ updated: number; scanned: number }> {
  const [coins, markets] = await Promise.all([
    fetchCoinGeckoMarkets(),
    prisma.market.findMany({
      where: { exchange: "bybit", type: MarketType.LINEAR, quoteAsset: "USDT", isActive: true },
      select: { id: true, symbol: true },
    }),
  ]);

  let updated = 0;
  for (const market of markets) {
    const coingeckoId = mapCoinGeckoIdForBybitSymbol(market.symbol, coins);
    if (!coingeckoId) continue;
    const sectorTags = inferSectorTags(coingeckoId);
    await prisma.market.update({
      where: { id: market.id },
      data: {
        coingeckoId,
        sectorTags,
        sectorUpdatedAt: new Date(),
      },
    });
    updated++;
  }

  return { updated, scanned: markets.length };
}
