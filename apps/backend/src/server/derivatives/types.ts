export interface DerivativeTickerSnapshot {
  symbol: string;
  price: number;
  change24hPct: number | null;
  fundingRate: number | null;
  openInterest: number | null;
  openInterestValue: number | null;
  turnover24h: number | null;
  volume24h: number | null;
  timestamp: number;
}

export interface LiquidationAggregate {
  buyQty: number;
  sellQty: number;
  buyNotional: number;
  sellNotional: number;
}

export interface OpenInterestChange {
  current: number;
  previous?: number;
  percentChange?: number;
}
