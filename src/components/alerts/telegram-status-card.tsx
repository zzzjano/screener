import { Card } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";

export function TelegramStatusCard({ connected }: { connected: boolean }) {
  return (
    <Card>
      <h3 className="mb-2 text-sm font-medium text-zinc-200">{pl.alerts.telegram}</h3>
      <p className="text-sm text-zinc-400">
        {connected ? pl.alerts.connected : pl.alerts.disconnected}
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        Skonfiguruj token bota w zmiennej TELEGRAM_BOT_TOKEN i podaj chat ID w ustawieniach.
      </p>
    </Card>
  );
}
