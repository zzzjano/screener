import { TerminalSidebar } from "./terminal-sidebar";
import { TerminalTopbar } from "./terminal-topbar";

export function TerminalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-dvh grid-cols-[48px_minmax(0,1fr)] grid-rows-[32px_minmax(0,1fr)] overflow-hidden bg-[#0b0e11] text-[#eaecef]">
      <TerminalSidebar />
      <TerminalTopbar />
      <main className="min-h-0 overflow-auto">{children}</main>
    </div>
  );
}

export function TerminalPage({ children }: { children: React.ReactNode }) {
  return <div className="h-full min-h-0 overflow-hidden p-1">{children}</div>;
}
