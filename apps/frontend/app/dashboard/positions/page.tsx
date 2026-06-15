import { PositionsTable } from "@/src/features/portfolio/components/positions-table";
import { TerminalPage, TerminalShell } from "@/src/components/terminal/terminal-shell";

export default function PositionsPage() {
  return (
    <TerminalShell>
      <TerminalPage>
        <PositionsTable />
      </TerminalPage>
    </TerminalShell>
  );
}
