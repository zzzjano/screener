import { NextResponse } from "next/server";
import { getRedis } from "@/src/lib/redis";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try {
    const redis = getRedis();
    await redis.ping();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", service: "crypto-screener" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "unknown" },
      { status: 503 },
    );
  }
}
