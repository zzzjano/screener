import WebSocket from "ws";
import { logger } from "@/src/lib/logger";
import { toBybitInterval } from "./timeframe";
import { upsertCandle } from "./rolling-window-store";
import { emitCandleClosed } from "./candle-events";
import type { Candle } from "../indicators/indicator-types";

const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear";

export interface KlineSubscription {
  symbol: string;
  timeframe: string;
}

export class BybitWsClient {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, KlineSubscription>();
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
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe([{ symbol, timeframe }]);
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
        await this.processKline(row, topicMeta);
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

    if (!candle.closed) return;

    const isNew = await upsertCandle(this.marketType, symbol, timeframe, candle);
    if (isNew) {
      await emitCandleClosed({
        exchange: "bybit",
        marketType: this.marketType,
        symbol,
        timeframe,
        candle,
      });
    }
  }
}

interface BybitWsMessage {
  op?: string;
  success?: boolean;
  topic?: string;
  data?: BybitKlineRow | BybitKlineRow[];
}

function mapBybitInterval(interval: string): string {
  const map: Record<string, string> = {
    "1": "1m",
    "3": "3m",
    "5": "5m",
    "15": "15m",
    "30": "30m",
    "60": "1h",
    "120": "2h",
    "240": "4h",
    "360": "6h",
    "720": "12h",
    D: "1d",
    W: "1w",
    M: "1M",
  };
  return map[interval] ?? interval;
}

function parseKlineTopic(topic: string): { symbol: string; timeframe: string } {
  // kline.15.BTCUSDT
  const parts = topic.split(".");
  const interval = parts[1] ?? "15";
  const symbol = parts[2] ?? "BTCUSDT";
  return { symbol, timeframe: mapBybitInterval(interval) };
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let singleton: BybitWsClient | null = null;

export function getBybitWsClient(): BybitWsClient {
  if (!singleton) singleton = new BybitWsClient();
  return singleton;
}
