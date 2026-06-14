import type { Comparator } from "./ast";

export interface OperandValue {
  current: number;
  previous?: number;
}

export function compareValues(
  comparator: Comparator,
  left: OperandValue,
  right: OperandValue,
  params?: Record<string, unknown>,
): boolean {
  const l = left.current;
  const r = right.current;
  const lp = left.previous;
  const rp = right.previous;

  switch (comparator) {
    case "LT":
      return l < r;
    case "LTE":
      return l <= r;
    case "GT":
      return l > r;
    case "GTE":
      return l >= r;
    case "EQ":
      return l === r;
    case "NEQ":
      return l !== r;
    case "BETWEEN": {
      const max = right.current;
      const min = params?.min as number | undefined ?? Math.min(l, max);
      const maxVal = params?.max as number | undefined ?? Math.max(l, max);
      return l >= min && l <= maxVal;
    }
    case "CROSSES_ABOVE":
      return lp !== undefined && rp !== undefined && lp <= rp && l > r;
    case "CROSSES_BELOW":
      return lp !== undefined && rp !== undefined && lp >= rp && l < r;
    case "PERCENT_CHANGE_GT": {
      if (lp === undefined || lp === 0) return false;
      const pct = ((l - lp) / lp) * 100;
      return pct > r;
    }
    case "PERCENT_CHANGE_LT": {
      if (lp === undefined || lp === 0) return false;
      const pct = ((l - lp) / lp) * 100;
      return pct < r;
    }
    case "VOLUME_SPIKE": {
      const multiplier = (params?.multiplier as number) ?? 2;
      const baseline = (params?.baseline as number) ?? r;
      return baseline > 0 && l >= baseline * multiplier;
    }
    default:
      return false;
  }
}
