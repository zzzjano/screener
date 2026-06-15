import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getDemoUserId } from "@/src/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ backtestId: string }> },
) {
  const userId = await getDemoUserId();
  const { backtestId } = await params;
  const run = await prisma.backtestRun.findFirst({
    where: { id: backtestId, userId },
    include: { signals: { take: 100, orderBy: { signalTime: "asc" } } },
  });
  if (!run) return NextResponse.json({ error: "Nie znaleziono backtestu" }, { status: 404 });
  return NextResponse.json({ run });
}
