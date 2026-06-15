import { describe, it, expect } from "vitest";
import { compareValues } from "@/src/server/rules/operators";

describe("operators", () => {
  it("LT compares correctly", () => {
    expect(compareValues("LT", { current: 10 }, { current: 20 })).toBe(true);
    expect(compareValues("LT", { current: 30 }, { current: 20 })).toBe(false);
  });

  it("CROSSES_ABOVE detects crossover", () => {
    expect(
      compareValues("CROSSES_ABOVE", { current: 21, previous: 19 }, { current: 20, previous: 20 }),
    ).toBe(true);
    expect(
      compareValues("CROSSES_ABOVE", { current: 19, previous: 18 }, { current: 20, previous: 20 }),
    ).toBe(false);
  });
});
