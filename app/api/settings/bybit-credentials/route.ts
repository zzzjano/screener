import { NextResponse } from "next/server";
import { getDemoUserId } from "@/src/lib/auth";
import {
  createBybitCredential,
  listCredentialMetadata,
} from "@/src/server/exchanges/credential-service";
import { redactCredentialError } from "@/src/server/security/redaction";

export async function GET() {
  const userId = await getDemoUserId();
  const credentials = await listCredentialMetadata(userId);
  return NextResponse.json({ credentials });
}

export async function POST(request: Request) {
  const userId = await getDemoUserId();
  const body = await request.json() as { label?: string; apiKey?: string; apiSecret?: string };
  if (!body.apiKey || !body.apiSecret) {
    return NextResponse.json({ error: "Brak API key lub API secret" }, { status: 400 });
  }

  try {
    const credential = await createBybitCredential({
      userId,
      apiKey: body.apiKey,
      apiSecret: body.apiSecret,
      label: body.label,
    });
    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: redactCredentialError(error) }, { status: 400 });
  }
}
