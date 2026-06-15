import { TelegramSettingsPanel } from "@/src/features/settings/components/telegram-settings-panel";
import { pl } from "@/src/lib/i18n/pl";
import { env } from "@/src/lib/env";
import { prisma } from "@/src/lib/prisma";
import { getDemoUserId } from "@/src/lib/auth";

export default async function TelegramSettingsPage() {
  const userId = await getDemoUserId();
  const connection = await prisma.telegramConnection.findFirst({
    where: { userId, isEnabled: true },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{pl.nav.telegram}</h2>
      <TelegramSettingsPanel
        botConfigured={Boolean(env.TELEGRAM_BOT_TOKEN?.trim())}
        connected={!!connection?.verifiedAt}
        initialChatId={connection?.chatIdEncrypted ?? ""}
        username={connection?.username}
      />
    </div>
  );
}
