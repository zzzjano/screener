import { prisma } from "@/src/lib/prisma";
import { AlertDeliveryStatus } from "@prisma/client";

export async function createAlertDelivery(
  alertId: string,
  screenerMatchId: string,
  message: string,
) {
  return prisma.alertDelivery.upsert({
    where: {
      alertId_screenerMatchId: { alertId, screenerMatchId },
    },
    update: {
      message,
      status: AlertDeliveryStatus.PENDING,
    },
    create: {
      alertId,
      screenerMatchId,
      message,
      status: AlertDeliveryStatus.PENDING,
    },
  });
}

export async function markDeliverySent(id: string, providerMessageId: string) {
  return prisma.alertDelivery.update({
    where: { id },
    data: {
      status: AlertDeliveryStatus.SENT,
      providerMessageId,
      sentAt: new Date(),
    },
  });
}

export async function markDeliveryFailed(id: string, error: string, attempts: number) {
  const nextRetryAt = new Date(Date.now() + Math.min(60_000 * 2 ** attempts, 3_600_000));
  return prisma.alertDelivery.update({
    where: { id },
    data: {
      status: AlertDeliveryStatus.FAILED,
      error,
      attempts,
      nextRetryAt,
    },
  });
}

export async function markDeliverySkippedCooldown(id: string) {
  return prisma.alertDelivery.update({
    where: { id },
    data: { status: AlertDeliveryStatus.SKIPPED_COOLDOWN },
  });
}
