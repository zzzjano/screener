import { Worker } from "bullmq";
import { getBullMqConnection } from "@/src/lib/bullmq";
import { prisma } from "@/src/lib/prisma";
import { renderAlertMessagePl } from "../../alerts/message-renderer-pl";
import { sendTelegramMessage } from "../../alerts/telegram-client";
import { isCooldownActive, setCooldown } from "../../alerts/cooldown";
import {
  createAlertDelivery,
  markDeliveryFailed,
  markDeliverySent,
  markDeliverySkippedCooldown,
} from "../../alerts/outbox";
import { logger } from "@/src/lib/logger";

import type { RuleEvaluationSnapshot } from "../../rules/evaluator";
interface AlertDeliveryJob {
  alertId: string;
  screenerMatchId: string;
  screenerName: string;
  symbol: string;
  timeframe: string;
  candle: { c: number; T: number };
  snapshots: RuleEvaluationSnapshot[];
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

      if (await isCooldownActive(alert.id, alert.cooldownSeconds)) {
        const delivery = await createAlertDelivery(
          alert.id,
          job.data.screenerMatchId,
          "Pominięto - cooldown",
        );
        await markDeliverySkippedCooldown(delivery.id);
        return { skipped: true, reason: "cooldown" };
      }

      const message = renderAlertMessagePl(
        {
          screenerName: job.data.screenerName,
          symbol: job.data.symbol,
          timeframe: job.data.timeframe,
          candle: job.data.candle as import("../../indicators/indicator-types").Candle,
          snapshots: job.data.snapshots,
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
        const messageId = await sendTelegramMessage(chatId, message);
        await markDeliverySent(delivery.id, messageId);
        await setCooldown(alert.id, alert.cooldownSeconds);
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
