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
      price: 123.45,
      change24hPct: -2.5,
      fundingRate: 0.0001,
      matchedConditions: [
        {
          nodeId: "1",
          label: "RSI 14 (15m): 39.95 < 40",
          leftValue: 39.95,
          rightValue: 40,
        },
      ],
      positionContext: {
        side: "LONG",
        entryPrice: 100,
        markPrice: 88,
        unrealizedPnl: -120,
        pnlPct: -12,
        liquidationPrice: 70,
      },
    });

    expect(message).toContain("Test Screener");
    expect(message).toContain("BTCUSDT");
    expect(message).toContain("Cena: <b>123.45</b>");
    expect(message).toContain("Zmiana 24h: -2.50%");
    expect(message).toContain("Funding: 0.0100%");
    expect(message).toContain("Pozycja: <b>LONG</b>");
    expect(message).toContain("PnL: -12.00% (-120)");
    expect(message).toContain("✅ RSI 14 (15m): 39.95 &lt; 40");
  });
});
