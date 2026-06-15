const BYBIT_INTERVAL_MAP: Record<string, string> = {
  "1m": "1",
  "3m": "3",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "2h": "120",
  "4h": "240",
  "6h": "360",
  "12h": "720",
  "1d": "D",
  "1w": "W",
  "1M": "M",
};

export function toBybitInterval(timeframe: string): string {
  return BYBIT_INTERVAL_MAP[timeframe] ?? timeframe;
}

export function fromBybitInterval(interval: string): string {
  const entry = Object.entries(BYBIT_INTERVAL_MAP).find(([, v]) => v === interval);
  return entry?.[0] ?? interval;
}

export function timeframeToMs(timeframe: string): number {
  const map: Record<string, number> = {
    "1m": 60_000,
    "3m": 180_000,
    "5m": 300_000,
    "15m": 900_000,
    "30m": 1_800_000,
    "1h": 3_600_000,
    "2h": 7_200_000,
    "4h": 14_400_000,
    "6h": 21_600_000,
    "12h": 43_200_000,
    "1d": 86_400_000,
    "1w": 604_800_000,
  };
  return map[timeframe] ?? 60_000;
}
