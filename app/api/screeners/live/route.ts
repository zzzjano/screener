import { NextResponse } from "next/server";
import { runInstantScan } from "@/src/server/screeners/instant-scan";
import { logger } from "@/src/lib/logger";

export const maxDuration = 300;

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const body = (await request.json()) as { ruleTree?: unknown };
    if (!body.ruleTree) {
      return NextResponse.json({ error: "Brak ruleTree" }, { status: 400 });
    }

    logger.info("POST /api/screeners/live - żądanie przyjęte");

    const result = await runInstantScan(body.ruleTree);

    logger.info("POST /api/screeners/live - odpowiedź gotowa", {
      scanned: result.scanned,
      matched: result.matched,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd skanowania";
    logger.error("POST /api/screeners/live - błąd", {
      message,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
