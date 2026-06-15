import { getRedis } from "../../../lib/redis";

export const DEAD_LETTER_STREAM = "stream:dead-letter:market";

export async function writeMarketDeadLetter(input: {
  stream: string;
  id?: string;
  reason: string;
  payload?: unknown;
}): Promise<void> {
  await getRedis().xadd(
    DEAD_LETTER_STREAM,
    "MAXLEN",
    "~",
    "10000",
    "*",
    "sourceStream",
    input.stream,
    "sourceId",
    input.id ?? "",
    "reason",
    input.reason,
    "payload",
    JSON.stringify(input.payload ?? null),
    "createdAt",
    String(Date.now()),
  );
}
