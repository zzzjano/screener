import { env } from "@/src/lib/env";
import { logger } from "@/src/lib/logger";

export interface TelegramInlineButton {
  text: string;
  url: string;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  buttons: TelegramInlineButton[] = [],
): Promise<string> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Brak TELEGRAM_BOT_TOKEN");
  }

  const replyMarkup =
    buttons.length > 0
      ? { inline_keyboard: [buttons.map((button) => ({ text: button.text, url: button.url }))] }
      : undefined;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    }),
  });

  const data = (await response.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
  if (!data.ok) {
    throw new Error(data.description ?? "Błąd Telegram API");
  }

  logger.info("Wysłano alert Telegram", { chatId });
  return String(data.result?.message_id ?? "");
}
