"use server";

import { revalidatePath } from "next/cache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

export async function saveTelegramConnection(chatId: string, username?: string) {
  const res = await fetch(`${API_URL}/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, username }),
  });
  if (!res.ok) throw new Error("Failed to save telegram connection");
  revalidatePath("/ustawienia/telegram");
}

export async function saveTelegramChatId(chatId: string) {
  const normalized = chatId.trim();
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error("invalid_chat_id");
  }
  await saveTelegramConnection(normalized);
}

export async function disconnectTelegram() {
  const res = await fetch(`${API_URL}/telegram`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to disconnect telegram");
  revalidatePath("/ustawienia/telegram");
}

export async function sendTestTelegramMessage() {
  const res = await fetch(`${API_URL}/telegram/test`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to send test message");
}
