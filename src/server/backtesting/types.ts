import type { RuleTree } from "../rules/ast";

export interface BacktestExitConfig {
  kind: "TAKE_PROFIT_STOP_LOSS" | "BARS_ELAPSED" | "EITHER";
  takeProfitPct?: number;
  stopLossPct?: number;
  maxBars?: number;
  feeBps?: number;
  slippageBps?: number;
}

export interface BacktestRequest {
  userId: string;
  screenerId?: string;
  name?: string;
  ruleTree: RuleTree;
  symbols: string[];
  timeframes: string[];
  startTime: Date;
  endTime: Date;
  exitConfig: BacktestExitConfig;
}

export interface BacktestMetrics {
  signalCount: number;
  winRatePct: number;
  maxDrawdownPct: number;
  averageReturnPct: number;
}
