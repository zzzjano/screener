"use server";

import { prisma } from "@/src/lib/prisma";
import { getDemoUserId } from "@/src/lib/auth";
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
