import { timeframeToMs } from "../market-data/timeframe";

export interface HistoricalBackfillChunk {
  symbol: string;
  timeframe: string;
  startMs: number;
  endMs: number;
}

export function planHistoricalBackfill(input: {
  symbols: string[];
  timeframes: string[];
  startTime: Date;
  endTime: Date;
  maxBarsPerChunk?: number;
}): HistoricalBackfillChunk[] {
  const chunks: HistoricalBackfillChunk[] = [];
  const maxBars = input.maxBarsPerChunk ?? 900;

  for (const symbol of input.symbols) {
    for (const timeframe of input.timeframes) {
      const stepMs = timeframeToMs(timeframe) * maxBars;
      for (let startMs = input.startTime.getTime(); startMs < input.endTime.getTime(); startMs += stepMs) {
        chunks.push({
          symbol,
          timeframe,
          startMs,
          endMs: Math.min(startMs + stepMs, input.endTime.getTime()),
        });
      }
    }
  }

  return chunks;
}
