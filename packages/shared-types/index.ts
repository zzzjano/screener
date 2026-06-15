export * from "./ast";
export * from "./validator";

export interface MatchedConditionBadge {
  nodeId: string;
  label: string;
  leftValue?: number;
  rightValue?: number;
}

export interface InstantScanMatch {
  symbol: string;
  price: number;
  volume24h: number;
  change24hPct: number | null;
  fundingRate: number | null;
  timeframe: string;
  matchedConditions: MatchedConditionBadge[];
}

export interface InstantScanResult {
  scanned: number;
  matched: number;
  durationMs: number;
  results: InstantScanMatch[];
}
