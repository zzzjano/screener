import { NextResponse } from "next/server";
import { saveTelegramConnection } from "@/src/features/settings/telegram-actions";

export async function POST(request: Request) {
  const body = (await request.json()) as { chatId?: string; username?: string };
  if (!body.chatId) {
    return NextResponse.json({ error: "Brak chatId" }, { status: 400 });
  }
  await saveTelegramConnection(body.chatId, body.username);
  return NextResponse.json({ ok: true });
}
