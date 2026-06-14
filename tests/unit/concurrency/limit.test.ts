import { describe, it, expect } from "vitest";
import { createLimit, mapWithLimit } from "@/src/lib/concurrency/limit";

describe("createLimit", () => {
  it("caps concurrent executions", async () => {
    const limit = createLimit(2);
    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 8 }, (_, index) =>
      limit(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        return index;
      }),
    );

    const results = await Promise.all(tasks);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

describe("mapWithLimit", () => {
  it("maps items with bounded concurrency", async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapWithLimit([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    });

    expect(results).toEqual([2, 4, 6, 8]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
