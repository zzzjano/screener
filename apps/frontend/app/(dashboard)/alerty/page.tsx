import { pl } from "@/src/lib/i18n/pl";
import { prisma } from "@/src/lib/prisma";
import { getDemoUserId } from "@/src/lib/auth";
import { Card } from "@/src/components/ui";

export default async function AlertsPage() {
  const userId = await getDemoUserId();
  const deliveries = await prisma.alertDelivery.findMany({
    where: { alert: { screener: { userId } } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { alert: { include: { screener: { select: { name: true } } } } },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{pl.alerts.title}</h2>
      <Card>
        <h3 className="mb-3 text-sm font-medium text-zinc-300">{pl.alerts.history}</h3>
        {deliveries.length === 0 ? (
          <p className="text-sm text-zinc-500">{pl.alerts.noAlerts}</p>
        ) : (
          <ul className="space-y-2">
            {deliveries.map((d) => (
              <li key={d.id} className="rounded-lg border border-zinc-800 px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span>{d.alert.screener.name}</span>
                  <span className="text-zinc-500">{d.status}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{new Date(d.createdAt).toLocaleString("pl-PL")}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
