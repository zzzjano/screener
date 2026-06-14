import { LiveScreenerPanel } from "@/src/features/screeners/components/live-screener-panel";
import { pl } from "@/src/lib/i18n/pl";

export default function LiveScreenerPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{pl.liveScreener.title}</h2>
      <LiveScreenerPanel />
    </div>
  );
}
