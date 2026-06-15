import type { Redis } from "ioredis";
import { getRedis } from "@/src/lib/redis";
import type { Candle } from "../../indicators/indicator-types";

export const MARKET_STREAMS = {
  kline: "stream:bybit:linear:kline",
  ticker: "stream:bybit:linear:ticker",
  liquidation: "stream:bybit:linear:liquidation",
} as const;

export const MARKET_STREAM_GROUPS = {
  marketCache: "cg:market-cache",
  evaluationDispatch: "cg:evaluation-dispatch",
} as const;

export interface KlineStreamEvent {
  eventType: "kline";
  exchange: "bybit";
  marketType: string;
  symbol: string;
  timeframe: string;
  candle: Candle;
  receivedAt: number;
}

export interface TickerStreamEvent {
  eventType: "ticker";
  exchange: "bybit";
  marketType: string;
  symbol: string;
  price: number;
  change24hPct: number | null;
  fundingRate: number | null;
  openInterest: number | null;
  openInterestValue: number | null;
  turnover24h: number | null;
  volume24h: number | null;
  receivedAt: number;
}

export interface LiquidationStreamEvent {
  eventType: "liquidation";
  exchange: "bybit";
  marketType: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  notional: number;
  timestamp: number;
  receivedAt: number;
}

export type MarketStreamEvent = KlineStreamEvent | TickerStreamEvent | LiquidationStreamEvent;

export function streamForEvent(event: MarketStreamEvent): string {
  return MARKET_STREAMS[event.eventType];
}

export async function publishMarketEvent(
  event: MarketStreamEvent,
  redis: Redis = getRedis(),
): Promise<string> {
  return (await redis.xadd(
    streamForEvent(event),
    "MAXLEN",
    "~",
    "50000",
    "*",
    "payload",
    JSON.stringify(event),
  )) ?? "";
}

export async function ensureMarketStreamGroup(
  stream: string,
  group: string,
  redis: Redis = getRedis(),
): Promise<void> {
  try {
    await redis.xgroup("CREATE", stream, group, "$", "MKSTREAM");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("BUSYGROUP")) throw error;
  }
}

export async function readMarketStreamBatch(
  stream: string,
  group: string,
  consumer: string,
  count = 100,
  redis: Redis = getRedis(),
): Promise<Array<{ id: string; event: MarketStreamEvent }>> {
  await ensureMarketStreamGroup(stream, group, redis);
  const response = await redis.xreadgroup(
    "GROUP",
    group,
    consumer,
    "COUNT",
    count,
    "STREAMS",
    stream,
    ">",
  ) as Array<[string, Array<[string, string[]]>]> | null;
  const rows = response?.[0]?.[1] ?? [];
  return rows.flatMap(([id, fields]) => {
    const payloadIndex = fields.findIndex((field) => field === "payload");
    const payload = payloadIndex >= 0 ? fields[payloadIndex + 1] : null;
    if (!payload) return [];
    return [{ id, event: JSON.parse(payload) as MarketStreamEvent }];
  });
}

export async function ackMarketStreamBatch(
  stream: string,
  group: string,
  ids: string[],
  redis: Redis = getRedis(),
): Promise<void> {
  if (ids.length === 0) return;
  await redis.xack(stream, group, ...ids);
}
