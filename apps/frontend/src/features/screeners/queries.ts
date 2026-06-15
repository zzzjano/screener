import { prisma } from "@/src/lib/prisma";
import { getDemoUserId } from "@/src/lib/auth";

export async function getScreenersForDashboard() {
  const userId = await getDemoUserId();
  return prisma.screener.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });
}

export async function getRecentMatches(limit = 10) {
  const userId = await getDemoUserId();
  return prisma.screenerMatch.findMany({
    where: { screener: { userId }, matched: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { screener: { select: { name: true } } },
  });
}
