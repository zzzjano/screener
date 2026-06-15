import { beforeEach, describe, expect, it, vi } from "vitest";

describe("sendTelegramMessage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  });

  it("sends inline keyboard buttons through reply_markup", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { sendTelegramMessage } = await import("@/src/server/alerts/telegram-client");
    const messageId = await sendTelegramMessage("42", "<b>Alert</b>", [
      { text: "📈 Trade BTCUSDT on Bybit", url: "https://www.bybit.com/trade/usdt/BTCUSDT" },
    ]);

    expect(messageId).toBe("123");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      chat_id: string;
      text: string;
      parse_mode: string;
      reply_markup: { inline_keyboard: Array<Array<{ text: string; url: string }>> };
    };
    expect(body.chat_id).toBe("42");
    expect(body.parse_mode).toBe("HTML");
    expect(body.reply_markup.inline_keyboard[0][0]).toEqual({
      text: "📈 Trade BTCUSDT on Bybit",
      url: "https://www.bybit.com/trade/usdt/BTCUSDT",
    });
  });
});
