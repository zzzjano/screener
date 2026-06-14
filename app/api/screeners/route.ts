import { NextResponse } from "next/server";
import { listScreeners } from "@/src/features/screeners/actions";

export async function GET() {
  const screeners = await listScreeners();
  return NextResponse.json(screeners);
}
