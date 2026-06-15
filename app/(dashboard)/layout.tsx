import { TerminalShell } from "@/src/components/terminal/terminal-shell";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <TerminalShell>{children}</TerminalShell>;
}
