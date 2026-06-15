import { ApiKeyForm } from "@/src/features/portfolio/components/api-key-form";

export default function BybitSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Bybit API</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Dodaj klucz read-only, aby monitorować pozycje, PnL i margin w screenerach.
        </p>
      </div>
      <ApiKeyForm />
    </div>
  );
}
