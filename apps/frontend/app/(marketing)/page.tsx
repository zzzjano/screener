import Link from "next/link";
import { pl } from "@/src/lib/i18n/pl";
import { Button } from "@/src/components/ui";

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold text-zinc-50">{pl.app.name}</h1>
      <p className="mt-4 max-w-xl text-lg text-zinc-400">{pl.app.tagline}</p>
      <Link href="/dashboard" className="mt-8">
        <Button>{pl.nav.dashboard}</Button>
      </Link>
    </main>
  );
}
