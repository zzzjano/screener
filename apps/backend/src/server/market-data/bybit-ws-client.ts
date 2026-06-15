import WebSocket from "ws";
import { logger } from "@/src/lib/logger";
import { fromBybitInterval, toBybitInterval } from "./timeframe";
import type { Candle } from "../indicators/indicator-types";
import { publishMarketEvent } from "./streams/market-events";
import { normalizeBybitPercentRatio, toFiniteNumber } from "../derivatives/normalizers";

const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear";

export interface KlineSubscription {
  symbol: string;
  timeframe: string;
}

export class BybitWsClient {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, KlineSubscription>();
  private tickerSymbols = new Set<string>();
  private liquidationSymbols = new Set<string>();
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private marketType = "LINEAR") {}

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    this.running = true;
    await this.connect();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.ws?.close();
    this.ws = null;
  }

  subscribe(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    this.subscriptions.set(key, { symbol, timeframe });
    this.tickerSymbols.add(symbol);
    this.liquidationSymbols.add(symbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe([{ symbol, timeframe }]);
      this.sendTickerSubscribe([symbol]);
      this.sendLiquidationSubscribe([symbol]);
    }
  }

  unsubscribe(symbol: string, timeframe: string): void {
    const key = `${symbol}:${timeframe}`;
    this.subscriptions.delete(key);
  }

  private async connect(): Promise<void> {
    if (!this.running) return;

    this.ws = new WebSocket(BYBIT_WS_URL);

    this.ws.on("open", () => {
      logger.info("Połączono z Bybit WebSocket");
      this.reconnectAttempts = 0;
      this.sendSubscribe(Array.from(this.subscriptions.values()));
      this.sendTickerSubscribe(Array.from(this.tickerSymbols));
      this.sendLiquidationSubscribe(Array.from(this.liquidationSymbols));
      this.heartbeatTimer = setInterval(() => {
        this.ws?.send(JSON.stringify({ op: "ping" }));
      }, 20_000);
    });

    this.ws.on("message", (data) => {
      void this.handleMessage(data.toString());
    });

    this.ws.on("close", () => {
      logger.warn("Bybit WebSocket rozłączony");
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      void this.reconnect();
    });

    this.ws.on("error", (err) => {
      logger.error("Błąd Bybit WebSocket", { error: String(err) });
    });
  }

  private async reconnect(): Promise<void> {
    if (!this.running) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    await sleep(delay);
    await this.connect();
  }

  private sendSubscribe(subs: KlineSubscription[]): void {
    if (subs.length === 0 || this.ws?.readyState !== WebSocket.OPEN) return;
    const args = subs.map((s) => `kline.${toBybitInterval(s.timeframe)}.${s.symbol}`);
    this.ws.send(JSON.stringify({ op: "subscribe", args }));
  }

  private sendTickerSubscribe(symbols: string[]): void {
    if (symbols.length === 0 || this.ws?.readyState !== WebSocket.OPEN) return;
    const args = symbols.map((symbol) => `tickers.${symbol}`);
    this.ws.send(JSON.stringify({ op: "subscribe", args }));
  }

  private sendLiquidationSubscribe(symbols: string[]): void {
    if (symbols.length === 0 || this.ws?.readyState !== WebSocket.OPEN) return;
    const args = symbols.map((symbol) => `liquidation.${symbol}`);
    this.ws.send(JSON.stringify({ op: "subscribe", args }));
  }

  private async handleMessage(raw: string): Promise<void> {
    let msg: BybitWsMessage;
    try {
      msg = JSON.parse(raw) as BybitWsMessage;
    } catch {
      return;
    }

    if (msg.op === "pong" || msg.success === true) return;
    if (msg.topic?.startsWith("kline.")) {
      const topicMeta = parseKlineTopic(msg.topic);
      const data = msg.data;
      const rows = Array.isArray(data) ? data : data ? [data] : [];
      for (const row of rows) {
        await this.processKline(row as BybitKlineRow, topicMeta);
      }
      return;
    }

    if (msg.topic?.startsWith("tickers.")) {
      const data = Array.isArray(msg.data) ? msg.data[0] : msg.data;
      if (data) await this.processTicker(data as BybitTickerRow, parseSymbolTopic(msg.topic));
      return;
    }

    if (msg.topic?.startsWith("liquidation.")) {
      const rows = Array.isArray(msg.data) ? msg.data : msg.data ? [msg.data] : [];
      const symbol = parseSymbolTopic(msg.topic);
      for (const row of rows) {
        await this.processLiquidation(row as BybitLiquidationRow, symbol);
      }
    }
  }

  private async processKline(
    row: BybitKlineRow,
    topic: { symbol: string; timeframe: string },
  ): Promise<void> {
    const symbol = row.symbol ?? topic.symbol;
    const timeframe = row.interval ? mapBybitInterval(row.interval) : topic.timeframe;
    const candle: Candle = {
      t: Number(row.start),
      T: Number(row.end ?? row.start),
      o: parseFloat(row.open),
      h: parseFloat(row.high),
      l: parseFloat(row.low),
      c: parseFloat(row.close),
      v: parseFloat(row.volume),
      turnover: row.turnover ? parseFloat(row.turnover) : undefined,
      closed: row.confirm === true,
    };

    await publishMarketEvent({
      eventType: "kline",
      exchange: "bybit",
      marketType: this.marketType,
      symbol,
      timeframe,
      candle,
      receivedAt: Date.now(),
    });
  }

  private async processTicker(row: BybitTickerRow, topicSymbol: string): Promise<void> {
    const symbol = row.symbol ?? topicSymbol;
    const price = toFiniteNumber(row.lastPrice ?? row.markPrice ?? row.indexPrice) ?? 0;
    const openInterest = toFiniteNumber(row.openInterest);
    await publishMarketEvent({
      eventType: "ticker",
      exchange: "bybit",
      marketType: this.marketType,
      symbol,
      price,
      change24hPct: normalizeBybitPercentRatio(row.price24hPcnt),
      fundingRate: toFiniteNumber(row.fundingRate),
      openInterest,
      openInterestValue: openInterest !== null ? openInterest * price : null,
      turnover24h: toFiniteNumber(row.turnover24h),
      volume24h: toFiniteNumber(row.volume24h),
      receivedAt: Date.now(),
    });
  }

  private async processLiquidation(row: BybitLiquidationRow, topicSymbol: string): Promise<void> {
    const symbol = row.symbol ?? topicSymbol;
    const price = toFiniteNumber(row.price) ?? 0;
    const qty = toFiniteNumber(row.qty ?? row.size) ?? 0;
    await publishMarketEvent({
      eventType: "liquidation",
      exchange: "bybit",
      marketType: this.marketType,
      symbol,
      side: row.side === "Buy" ? "BUY" : "SELL",
      price,
      qty,
      notional: price * qty,
      timestamp: Number(row.updatedTime ?? row.time ?? Date.now()),
      receivedAt: Date.now(),
    });
  }
}

interface BybitWsMessage {
  op?: string;
  success?: boolean;
  topic?: string;
  data?: BybitKlineRow | BybitKlineRow[] | BybitTickerRow | BybitLiquidationRow | BybitLiquidationRow[];
}

function mapBybitInterval(interval: string): string {
  return fromBybitInterval(interval);
}

function parseKlineTopic(topic: string): { symbol: string; timeframe: string } {
  // kline.15.BTCUSDT
  const parts = topic.split(".");
  const interval = parts[1] ?? "15";
  const symbol = parts[2] ?? "BTCUSDT";
  return { symbol, timeframe: mapBybitInterval(interval) };
}

function parseSymbolTopic(topic: string): string {
  return topic.split(".")[1] ?? "BTCUSDT";
}

interface BybitKlineRow {
  start: number | string;
  end?: number | string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  turnover?: string;
  confirm?: boolean;
  symbol?: string;
  interval?: string;
}

interface BybitTickerRow {
  symbol?: string;
  lastPrice?: string;
  markPrice?: string;
  indexPrice?: string;
  price24hPcnt?: string;
  fundingRate?: string;
  openInterest?: string;
  turnover24h?: string;
  volume24h?: string;
}

interface BybitLiquidationRow {
  symbol?: string;
  side?: "Buy" | "Sell";
  price?: string;
  qty?: string;
  size?: string;
  updatedTime?: string;
  time?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let singleton: BybitWsClient | null = null;

export function getBybitWsClient(): BybitWsClient {
  if (!singleton) singleton = new BybitWsClient();
  return singleton;
}
