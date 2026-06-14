import { describe, it, expect } from "vitest";
import { renderAlertMessagePl } from "@/src/server/alerts/message-renderer-pl";

describe("alert message renderer", () => {
  it("renders polish alert template", () => {
    const message = renderAlertMessagePl({
      screenerName: "Test Screener",
      symbol: "BTCUSDT",
      timeframe: "15m",
      candle: { t: 0, T: 1, o: 1, h: 2, l: 1, c: 1.5, v: 100, closed: true },
      snapshots: [{ nodeId: "1", passed: true, explanationPl: "RSI < 30" }],
    });

    expect(message).toContain("Test Screener");
    expect(message).toContain("BTCUSDT");
    expect(message).toContain("RSI < 30");
  });
});
