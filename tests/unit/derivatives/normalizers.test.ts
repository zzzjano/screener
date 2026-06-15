import { describe, expect, it } from "vitest";
import { buildOpenInterestChange, normalizeBybitPercentRatio, toFiniteNumber } from "@/src/server/derivatives/normalizers";

describe("derivative normalizers", () => {
  it("normalizes Bybit ratio fields into percentages", () => {
    expect(normalizeBybitPercentRatio("0.0123")).toBe(1.23);
    expect(normalizeBybitPercentRatio("bad")).toBeNull();
  });

  it("calculates open interest percent change", () => {
    expect(buildOpenInterestChange(120, 100)).toEqual({
      current: 120,
      previous: 100,
      percentChange: 20,
    });
  });

  it("guards non-finite numbers", () => {
    expect(toFiniteNumber("42")).toBe(42);
    expect(toFiniteNumber(undefined)).toBeNull();
  });
});
