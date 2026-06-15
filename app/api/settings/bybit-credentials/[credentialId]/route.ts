import { NextResponse } from "next/server";
import { getDemoUserId } from "@/src/lib/auth";
import { disableCredential } from "@/src/server/exchanges/credential-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const userId = await getDemoUserId();
  const { credentialId } = await params;
  await disableCredential(userId, credentialId);
  return NextResponse.json({ ok: true });
}
