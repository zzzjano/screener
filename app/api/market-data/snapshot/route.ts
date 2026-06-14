import { NextResponse } from "next/server";
import { getRollingWindow } from "@/src/server/market-data/rolling-window-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "BTCUSDT";
  const timeframe = searchParams.get("timeframe") ?? "15m";
  const marketType = searchParams.get("marketType") ?? "LINEAR";

  const candles = await getRollingWindow(marketType, symbol, timeframe);
  return NextResponse.json({ symbol, timeframe, candles, count: candles.length });
}
