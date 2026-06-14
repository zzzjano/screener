import { NextResponse } from "next/server";
import { runInstantScan } from "@/src/server/screeners/instant-scan";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ruleTree?: unknown };
    if (!body.ruleTree) {
      return NextResponse.json({ error: "Brak ruleTree" }, { status: 400 });
    }

    const result = await runInstantScan(body.ruleTree);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd skanowania";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
