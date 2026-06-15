import { NextResponse } from "next/server";
import { getDemoUserId } from "@/src/lib/auth";
import { getActiveBybitCredentialMetadata } from "@/src/server/exchanges/credential-service";
import { syncPortfolioCredential } from "@/src/server/portfolio/portfolio-sync";

export async function POST() {
  const userId = await getDemoUserId();
  const credential = await getActiveBybitCredentialMetadata(userId);
  if (!credential) {
    return NextResponse.json({ error: "Brak aktywnego klucza Bybit" }, { status: 404 });
  }
  const result = await syncPortfolioCredential({ userId, credentialId: credential.id });
  return NextResponse.json({ synced: true, ...result });
}
