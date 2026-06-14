"use client";

import { useState } from "react";
import { Badge, Button, Card, Input } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import {
  disconnectTelegram,
  saveTelegramChatId,
  sendTestTelegramMessage,
} from "@/src/features/settings/telegram-actions";

interface TelegramSettingsPanelProps {
  botConfigured: boolean;
  connected: boolean;
  initialChatId?: string;
  username?: string | null;
}

export function TelegramSettingsPanel({
  botConfigured,
  connected,
  initialChatId = "",
  username,
}: TelegramSettingsPanelProps) {
  const [chatId, setChatId] = useState(initialChatId);
  const [loading, setLoading] = useState<"save" | "test" | "disconnect" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading("save");
    setError(null);
    setMessage(null);
    try {
      await saveTelegramChatId(chatId);
      setMessage(pl.common.success);
    } catch (err) {
      if (err instanceof Error && err.message === "invalid_chat_id") {
        setError(pl.telegram.invalidChatId);
      } else {
        setError(err instanceof Error ? err.message : pl.common.error);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleTest() {
    setLoading("test");
    setError(null);
    setMessage(null);
    try {
      await sendTestTelegramMessage();
      setMessage(pl.telegram.testSent);
    } catch (err) {
      setError(err instanceof Error ? err.message : pl.telegram.testFailed);
    } finally {
      setLoading(null);
    }
  }

  async function handleDisconnect() {
    setLoading("disconnect");
    setError(null);
    setMessage(null);
    try {
      await disconnectTelegram();
      setChatId("");
      setMessage(pl.common.success);
    } catch (err) {
      setError(err instanceof Error ? err.message : pl.common.error);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-200">{pl.alerts.telegram}</h3>
        <div className="flex flex-wrap gap-2">
          <Badge tone={botConfigured ? "success" : "warning"}>
            {botConfigured ? pl.telegram.botConfigured : pl.telegram.botMissing}
          </Badge>
          <Badge tone={connected ? "success" : "warning"}>
            {connected ? pl.telegram.chatConnected : pl.telegram.chatMissing}
          </Badge>
        </div>
        {username && (
          <p className="text-xs text-zinc-500">
            @{username}
          </p>
        )}
      </Card>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">{pl.telegram.chatIdLabel}</span>
            <Input
              placeholder={pl.telegram.chatIdPlaceholder}
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              inputMode="numeric"
              required
            />
          </label>
          <p className="text-xs text-zinc-500">{pl.telegram.chatIdHelp}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading !== null || !chatId.trim()}>
              {loading === "save" ? pl.common.loading : pl.telegram.saveChatId}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={loading !== null || !connected || !botConfigured}
              onClick={handleTest}
            >
              {loading === "test" ? pl.common.loading : pl.telegram.sendTest}
            </Button>
            {connected && (
              <Button
                type="button"
                variant="danger"
                disabled={loading !== null}
                onClick={handleDisconnect}
              >
                {loading === "disconnect" ? pl.common.loading : pl.telegram.disconnect}
              </Button>
            )}
          </div>
        </form>
      </Card>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
