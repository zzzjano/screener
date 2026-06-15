import { Worker } from "bullmq";
import { getBullMqConnection } from "../../../lib/bullmq";
import { prisma } from "../../../lib/prisma";
import {
  bybitTradeButtonText,
  bybitTradeUrl,
  renderAlertMessagePl,
} from "../../alerts/message-renderer-pl";
import { sendTelegramMessage } from "../../alerts/telegram-client";
import {
  createAlertDelivery,
  markDeliveryFailed,
  markDeliverySent,
} from "../../alerts/outbox";
import { logger } from "../../../lib/logger";

import type { RuleEvaluationSnapshot } from "../../rules/evaluator";
import type { MatchedConditionBadge } from "../../screeners/match-format";
interface AlertDeliveryJob {
  alertId: string;
  screenerMatchId: string;
  screenerName: string;
  symbol: string;
  timeframe: string;
  candle: { c: number; T: number };
  snapshots: RuleEvaluationSnapshot[];
  matchedConditions?: MatchedConditionBadge[];
  price?: number | null;
  change24hPct?: number | null;
  fundingRate?: number | null;
  positionContext?: import("../../alerts/message-renderer-pl").AlertPositionContext | null;
}

export function createAlertDeliveryWorker(): Worker {
  return new Worker<AlertDeliveryJob>(
    "alert-delivery",
    async (job) => {
      const alert = await prisma.alert.findUnique({
        where: { id: job.data.alertId },
        include: {
          screener: {
            include: {
              user: { include: { telegramConnections: { where: { isEnabled: true } } } },
            },
          },
        },
      });

      if (!alert || !alert.isEnabled || !alert.telegramEnabled) {
        return { skipped: true };
      }

      const message = renderAlertMessagePl(
        {
          screenerName: job.data.screenerName,
          symbol: job.data.symbol,
          timeframe: job.data.timeframe,
          candle: job.data.candle as import("../../indicators/indicator-types").Candle,
          snapshots: job.data.snapshots,
          matchedConditions: job.data.matchedConditions,
          price: job.data.price,
          change24hPct: job.data.change24hPct,
          fundingRate: job.data.fundingRate,
          positionContext: job.data.positionContext,
        },
        alert.messageTemplate,
      );

      const delivery = await createAlertDelivery(alert.id, job.data.screenerMatchId, message);
      const connection = alert.screener.user.telegramConnections[0];

      if (!connection) {
        await markDeliveryFailed(delivery.id, "Brak połączenia Telegram", delivery.attempts + 1);
        return { skipped: true, reason: "no_telegram" };
      }

      try {
        const chatId = connection.chatIdEncrypted;
        const messageId = await sendTelegramMessage(chatId, message, [
          {
            text: bybitTradeButtonText(job.data.symbol),
            url: bybitTradeUrl(job.data.symbol),
          },
        ]);
        await markDeliverySent(delivery.id, messageId);
        return { sent: true };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        await markDeliveryFailed(delivery.id, err, delivery.attempts + 1);
        logger.error("Błąd wysyłki Telegram", { error: err });
        throw error;
      }
    },
    { connection: getBullMqConnection(), concurrency: 2 },
  );
}
