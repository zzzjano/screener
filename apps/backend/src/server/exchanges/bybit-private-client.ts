import https from "https";
import ccxt, { type Balances, type bybit, type Position } from "ccxt";
import { normalizeCompactSymbol } from "../market-data/ccxt-client";
import { redactCredentialError } from "../security/redaction";

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 8,
  maxFreeSockets: 4,
  timeout: 20_000,
});

export interface PrivateBybitCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface NormalizedPrivatePosition {
  symbol: string;
  side: "LONG" | "SHORT" | "NONE";
  contracts: number | null;
  entryPrice: number | null;
  markPrice: number | null;
  notional: number | null;
  leverage: number | null;
  unrealizedPnl: number | null;
  pnlPct: number | null;
  liquidationPrice: number | null;
  marginMode: string | null;
  raw: unknown;
}

export interface NormalizedPortfolioSummary {
  accountType: string | null;
  totalEquity: number | null;
  availableBalance: number | null;
  maintenanceMargin: number | null;
  initialMargin: number | null;
  raw: unknown;
}

export function createPrivateBybitClient(credentials: PrivateBybitCredentials): any {
  // @ts-ignore
  return new ccxt.bybit({
    apiKey: credentials.apiKey,
    secret: credentials.apiSecret,
    enableRateLimit: true,
    timeout: 20_000,
    options: { defaultType: "linear" },
    agent: httpsAgent,
    httpsAgent,
  });
}

export async function fetchPrivatePortfolioSnapshot(credentials: PrivateBybitCredentials): Promise<{
  balance: NormalizedPortfolioSummary;
  positions: NormalizedPrivatePosition[];
}> {
  const exchange = createPrivateBybitClient(credentials);
  try {
    const [balance, positions] = await Promise.all([
      exchange.fetchBalance({ type: "swap" }),
      exchange.fetchPositions(undefined, { category: "linear" }),
    ]);
    return {
      balance: normalizeBalance(balance),
      positions: positions.map(normalizePosition).filter((p: NormalizedPrivatePosition) => (p.contracts ?? 0) !== 0),
    };
  } catch (error) {
    throw new Error(redactCredentialError(error));
  }
}

function normalizeBalance(balance: Balances): NormalizedPortfolioSummary {
  const info = (balance.info ?? {}) as Record<string, unknown>;
  const result = Array.isArray(info.result)
    ? undefined
    : (info.result as Record<string, unknown> | undefined);
  const list = Array.isArray(result?.list) ? (result.list[0] as Record<string, unknown>) : undefined;
  return {
    accountType: stringValue(list?.accountType),
    totalEquity: numberValue(list?.totalEquity ?? balanceValue(balance.total, "USDT")),
    availableBalance: numberValue(list?.totalAvailableBalance ?? balanceValue(balance.free, "USDT")),
    maintenanceMargin: numberValue(list?.totalMaintenanceMargin),
    initialMargin: numberValue(list?.totalInitialMargin),
    raw: balance.info ?? balance,
  };
}

function normalizePosition(position: Position): NormalizedPrivatePosition {
  const info = (position.info ?? {}) as Record<string, unknown>;
  const symbol = normalizeCompactSymbol(position.symbol ?? stringValue(info.symbol) ?? "");
  const side = normalizeSide(position.side ?? stringValue(info.side));
  const contracts = numberValue(position.contracts ?? info.size);
  const entryPrice = numberValue(position.entryPrice ?? info.avgPrice);
  const markPrice = numberValue(position.markPrice ?? info.markPrice);
  const notional = numberValue(position.notional ?? info.positionValue);
  const leverage = numberValue(position.leverage ?? info.leverage);
  const unrealizedPnl = numberValue(position.unrealizedPnl ?? info.unrealisedPnl);
  const initialMargin = numberValue(info.positionIM ?? info.positionBalance);
  const fallbackPnlPct =
    entryPrice && markPrice && entryPrice > 0
      ? ((markPrice - entryPrice) / entryPrice) * 100 * (side === "SHORT" ? -1 : 1)
      : null;
  const pnlPct =
    unrealizedPnl !== null && initialMargin !== null && initialMargin !== 0
      ? (unrealizedPnl / initialMargin) * 100
      : fallbackPnlPct;

  return {
    symbol,
    side,
    contracts,
    entryPrice,
    markPrice,
    notional,
    leverage,
    unrealizedPnl,
    pnlPct,
    liquidationPrice: numberValue(position.liquidationPrice ?? info.liqPrice),
    marginMode: stringValue(position.marginMode ?? info.tradeMode),
    raw: position.info ?? position,
  };
}

function normalizeSide(value: unknown): "LONG" | "SHORT" | "NONE" {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "long" || normalized === "buy") return "LONG";
  if (normalized === "short" || normalized === "sell") return "SHORT";
  return "NONE";
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function balanceValue(value: unknown, currency: string): unknown {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[currency]
    : undefined;
}
