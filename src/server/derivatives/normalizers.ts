import type { OpenInterestChange } from "./types";

export function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeBybitPercentRatio(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : parsed * 100;
}

export function calculatePercentChange(current: number, previous?: number): number | undefined {
  if (previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

export function buildOpenInterestChange(current: number, previous?: number): OpenInterestChange {
  return {
    current,
    previous,
    percentChange: calculatePercentChange(current, previous),
  };
}
