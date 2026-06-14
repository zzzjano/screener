import { AppHeader, DashboardNav } from "@/src/components/layout/dashboard-nav";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <DashboardNav />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
