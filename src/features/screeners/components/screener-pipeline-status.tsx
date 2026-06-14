import { Card } from "@/src/components/ui";
import { pl } from "@/src/lib/i18n/pl";
import { formatWarsawDate } from "@/src/lib/dates";
import type { Screener, ScreenerMatch, Alert } from "@prisma/client";

type ScreenerWithRelations = Screener & {
  matches: ScreenerMatch[];
  alerts: Alert[];
};

export function ScreenerPipelineStatus({ screener }: { screener: ScreenerWithRelations }) {
  const hasTelegramAlert = screener.alerts.some((a) => a.telegramEnabled && a.isEnabled);
  const matchedCount = screener.matches.filter((m) => m.matched).length;

  return (
    <Card className="space-y-2 text-sm text-zinc-400">
      <h3 className="font-medium text-zinc-300">Status pipeline</h3>
      <ul className="space-y-1 text-xs">
        <li>Status screenera: <span className="text-zinc-200">{screener.status}</span></li>
        <li>
          Ostatnia ewaluacja:{" "}
          <span className="text-zinc-200">
            {screener.lastEvaluatedAt ? formatWarsawDate(screener.lastEvaluatedAt) : "jeszcze nie"}
          </span>
        </li>
        <li>
          Dopasowania w historii: <span className="text-zinc-200">{matchedCount}</span>
        </li>
        <li>
          Alerty Telegram:{" "}
          <span className="text-zinc-200">{hasTelegramAlert ? "włączone" : "wyłączone"}</span>
        </li>
      </ul>
      <p className="text-xs text-zinc-500">
        Ewaluacja działa po zamknięciu świecy (WebSocket) lub po backfillu przy aktywacji.
        Wymagany działający kontener <code className="text-zinc-400">worker</code> oraz połączenie Telegram w ustawieniach.
      </p>
    </Card>
  );
}
