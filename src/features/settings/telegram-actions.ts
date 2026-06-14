"use server";

import { prisma } from "@/src/lib/prisma";
import { getDemoUserId } from "@/src/lib/auth";
import { env } from "@/src/lib/env";
import { sendTelegramMessage } from "@/src/server/alerts/telegram-client";
import { revalidatePath } from "next/cache";

export async function saveTelegramConnection(chatId: string, username?: string) {
  const userId = await getDemoUserId();
  const existing = await prisma.telegramConnection.findFirst({ where: { userId } });

  if (existing) {
    await prisma.telegramConnection.update({
      where: { id: existing.id },
      data: { chatIdEncrypted: chatId, username, verifiedAt: new Date(), isEnabled: true },
    });
  } else {
    await prisma.telegramConnection.create({
      data: {
        userId,
        chatIdEncrypted: chatId,
        username,
        verifiedAt: new Date(),
        isEnabled: true,
      },
    });
  }

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
  const userId = await getDemoUserId();
  await prisma.telegramConnection.deleteMany({ where: { userId } });
  revalidatePath("/ustawienia/telegram");
}

export async function sendTestTelegramMessage() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("missing_bot_token");
  }

  const userId = await getDemoUserId();
  const connection = await prisma.telegramConnection.findFirst({
    where: { userId, isEnabled: true },
  });

  if (!connection?.chatIdEncrypted) {
    throw new Error("missing_chat_id");
  }

  await sendTelegramMessage(
    connection.chatIdEncrypted,
    "✅ Crypto Screener — test powiadomień Telegram działa.",
  );
}
