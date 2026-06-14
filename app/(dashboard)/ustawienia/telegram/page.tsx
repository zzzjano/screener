import { TelegramStatusCard } from "@/src/components/alerts/telegram-status-card";
import { pl } from "@/src/lib/i18n/pl";
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
      <TelegramStatusCard connected={!!connection?.verifiedAt} />
    </div>
  );
}
