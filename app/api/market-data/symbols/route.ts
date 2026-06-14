import { NextResponse } from "next/server";
import { getActiveSymbols } from "@/src/server/market-data/bybit-symbols";

export async function GET() {
  try {
    const symbols = await getActiveSymbols();
    return NextResponse.json({ symbols });
  } catch {
    return NextResponse.json({
      symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"],
    });
  }
}
