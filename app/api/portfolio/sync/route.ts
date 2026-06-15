import { NextResponse } from "next/server";
import { getDemoUserId } from "@/src/lib/auth";
import { getActiveBybitCredentialMetadata } from "@/src/server/exchanges/credential-service";
import { portfolioSyncQueue } from "@/src/server/jobs/queues";

export async function POST() {
  const userId = await getDemoUserId();
  const credential = await getActiveBybitCredentialMetadata(userId);
  if (!credential) {
    return NextResponse.json({ error: "Brak aktywnego klucza Bybit" }, { status: 404 });
  }
  await portfolioSyncQueue.add(
    "sync-one",
    { userId, credentialId: credential.id },
    { jobId: `portfolio-sync-${credential.id}-${Date.now()}` },
  );
  return NextResponse.json({ queued: true });
}
