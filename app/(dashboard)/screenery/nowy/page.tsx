import { pl } from "@/src/lib/i18n/pl";
import { ScreenerForm } from "@/src/features/screeners/components/screener-form";

export default function NewScreenerPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{pl.screener.new}</h2>
      <ScreenerForm />
    </div>
  );
}
