import { env } from "@/src/lib/env";
import { logger } from "@/src/lib/logger";

export async function sendTelegramMessage(chatId: string, text: string): Promise<string> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Brak TELEGRAM_BOT_TOKEN");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = (await response.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
  if (!data.ok) {
    throw new Error(data.description ?? "Błąd Telegram API");
  }

  logger.info("Wysłano alert Telegram", { chatId });
  return String(data.result?.message_id ?? "");
}
