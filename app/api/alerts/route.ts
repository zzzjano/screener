import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getDemoUserId } from "@/src/lib/auth";

export async function GET() {
  const userId = await getDemoUserId();
  const alerts = await prisma.alert.findMany({
    where: { screener: { userId } },
    include: { screener: { select: { name: true } }, deliveries: { take: 5, orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json(alerts);
}
