import { getCcxtBybit } from "./ccxt-client";
import { prisma } from "@/src/lib/prisma";
import { MarketType } from "@prisma/client";
import { logger } from "@/src/lib/logger";
import type { Market } from "ccxt";

export async function syncBybitMarkets(quoteAsset = "USDT"): Promise<number> {
  const exchange = getCcxtBybit();
  const markets = await exchange.loadMarkets();
  let count = 0;

  for (const market of Object.values(markets) as Market[]) {
    if (!market || !market.linear || !market.active) continue;
    if (market.quote !== quoteAsset) continue;

    const symbol = market.symbol.replace("/", "");
    await prisma.market.upsert({
      where: {
        exchange_type_symbol: {
          exchange: "bybit",
          type: MarketType.LINEAR,
          symbol,
        },
      },
      update: {
        isActive: true,
        precision: market.precision as object,
        limits: market.limits as object,
      },
      create: {
        exchange: "bybit",
        type: MarketType.LINEAR,
        symbol,
        baseAsset: market.base,
        quoteAsset: market.quote,
        isActive: true,
        precision: market.precision as object,
        limits: market.limits as object,
      },
    });
    count++;
  }

  logger.info("Zsynchronizowano rynki Bybit", { count });
  return count;
}

export async function getActiveSymbols(quoteAsset = "USDT"): Promise<string[]> {
  const markets = await prisma.market.findMany({
    where: { exchange: "bybit", type: MarketType.LINEAR, quoteAsset, isActive: true },
    select: { symbol: true },
    take: 500,
  });
  return markets.map((m) => m.symbol);
}
