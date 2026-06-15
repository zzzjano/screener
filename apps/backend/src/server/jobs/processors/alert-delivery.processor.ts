import { Worker } from "bullmq";
import { getBullMqConnection } from "../../../lib/bullmq";
import { getRedis } from "../../../lib/redis";
import { prisma } from "../../../lib/prisma";
import {
  bybitTradeButtonText,
  bybitTradeUrl,
  renderAlertMessagePl,
  renderBulkAlertMessagePl,
  type AlertMessageInput,
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
  screenerId?: string;
  cooldownSeconds?: number;
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
  return new Worker<any>(
    "alert-delivery",
    async (job) => {
      const redis = getRedis();
      
      if (job.name === "deliver_batch") {
        const alertId = job.data.alertId;
        const items = await redis.lrange(`pending_alerts:${alertId}`, 0, -1);
        if (items.length === 0) return { skipped: true, reason: "empty_batch" };
        await redis.del(`pending_alerts:${alertId}`);

        const parsedItems: AlertDeliveryJob[] = items.map(i => JSON.parse(i));
        
        const alert = await prisma.alert.findUnique({
          where: { id: alertId },
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

        const connection = alert.screener.user.telegramConnections[0];
        if (!connection) {
          return { skipped: true, reason: "no_telegram" };
        }

        const messageInputs: AlertMessageInput[] = parsedItems.map(item => ({
          screenerName: item.screenerName,
          symbol: item.symbol,
          timeframe: item.timeframe,
          candle: item.candle as import("../../indicators/indicator-types").Candle,
          snapshots: item.snapshots,
          matchedConditions: item.matchedConditions,
          price: item.price,
          change24hPct: item.change24hPct,
          fundingRate: item.fundingRate,
          positionContext: item.positionContext,
        }));

        const message = renderBulkAlertMessagePl(messageInputs);

        try {
          const chatId = connection.chatIdEncrypted;
          const buttons = parsedItems.length === 1 ? [
            {
              text: bybitTradeButtonText(parsedItems[0].symbol),
              url: bybitTradeUrl(parsedItems[0].symbol),
            }
          ] : undefined;

          const messageId = await sendTelegramMessage(chatId, message, buttons);

          for (const item of parsedItems) {
            const delivery = await createAlertDelivery(alert.id, item.screenerMatchId, message);
            await markDeliverySent(delivery.id, messageId);

            if (item.screenerId && item.cooldownSeconds && item.cooldownSeconds > 0) {
              await redis.set(
                `cooldown:${item.screenerId}:${item.symbol}`,
                "1",
                "EX",
                item.cooldownSeconds
              );
            }
          }

          logger.info("Wysłano powiadomienie grupowe", { count: parsedItems.length, alertId });
          return { sent: true, count: parsedItems.length };
        } catch (error) {
          const err = error instanceof Error ? error.message : String(error);
          logger.error("Błąd grupowej wysyłki Telegram", { error: err });
          throw error;
        }
      }

      // Legacy single delivery fallback
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

      if (!alert || !alert.isEnabled || !alert.telegramEnabled) return { skipped: true };

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

        if (job.data.screenerId && job.data.cooldownSeconds && job.data.cooldownSeconds > 0) {
          await redis.set(
            `cooldown:${job.data.screenerId}:${job.data.symbol}`,
            "1",
            "EX",
            job.data.cooldownSeconds
          );
        }

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
