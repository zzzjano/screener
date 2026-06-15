import { MarketType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { Candle } from "../indicators/indicator-types";

export async function upsertHistoricalCandles(input: {
  marketType: string;
  symbol: string;
  timeframe: string;
  candles: Candle[];
}): Promise<number> {
  if (input.candles.length === 0) return 0;
  await prisma.historicalCandle.createMany({
    data: input.candles.map((candle) => ({
      marketType: input.marketType as MarketType,
      symbol: input.symbol,
      timeframe: input.timeframe,
      openTime: new Date(candle.t),
      closeTime: new Date(candle.T),
      open: new Prisma.Decimal(candle.o),
      high: new Prisma.Decimal(candle.h),
      low: new Prisma.Decimal(candle.l),
      close: new Prisma.Decimal(candle.c),
      volume: new Prisma.Decimal(candle.v),
      turnover: candle.turnover === undefined ? undefined : new Prisma.Decimal(candle.turnover),
    })),
    skipDuplicates: true,
  });
  return input.candles.length;
}

export async function getHistoricalCandles(input: {
  marketType: string;
  symbol: string;
  timeframe: string;
  startTime: Date;
  endTime: Date;
}): Promise<Candle[]> {
  const rows = await prisma.historicalCandle.findMany({
    where: {
      marketType: input.marketType as MarketType,
      symbol: input.symbol,
      timeframe: input.timeframe,
      openTime: { gte: input.startTime, lte: input.endTime },
    },
    orderBy: { openTime: "asc" },
  });
  return rows.map((row) => ({
    t: row.openTime.getTime(),
    T: row.closeTime.getTime(),
    o: row.open.toNumber(),
    h: row.high.toNumber(),
    l: row.low.toNumber(),
    c: row.close.toNumber(),
    v: row.volume.toNumber(),
    turnover: row.turnover?.toNumber(),
    closed: true,
  }));
}
