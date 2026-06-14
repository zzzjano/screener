import { NextResponse } from "next/server";
import { getScreener } from "@/src/features/screeners/actions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ screenerId: string }> },
) {
  const { screenerId } = await params;
  const screener = await getScreener(screenerId);
  if (!screener) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  return NextResponse.json(screener);
}
