import { getRedis } from "@/src/lib/redis";

export interface StreamLagSnapshot {
  stream: string;
  group: string;
  pending: number;
  lastDeliveredId?: string;
}

export async function getStreamLag(stream: string, group: string): Promise<StreamLagSnapshot> {
  const groups = await getRedis().xinfo("GROUPS", stream).catch(() => []);
  const row = (groups as unknown[]).find((groupInfo) => {
    const fields = groupInfo as string[];
    return fields[fields.indexOf("name") + 1] === group;
  }) as string[] | undefined;

  if (!row) return { stream, group, pending: 0 };
  return {
    stream,
    group,
    pending: Number(row[row.indexOf("pending") + 1] ?? 0),
    lastDeliveredId: row[row.indexOf("last-delivered-id") + 1],
  };
}
