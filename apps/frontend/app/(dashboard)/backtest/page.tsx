import { BacktestForm } from "@/src/features/backtesting/components/backtest-form";
import { BacktestResults } from "@/src/features/backtesting/components/backtest-results";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";

export default function BacktestPage() {
  return (
    <div className="grid min-h-full gap-1 p-1 lg:grid-cols-[420px_minmax(0,1fr)]">
      <Panel>
        <PanelHeader title="Backtest" subtitle="Run current AST rules against historical data" />
        <PanelBody>
          <BacktestForm />
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Time Machine" subtitle="Queued runs and metrics surface here" />
        <PanelBody>
          <BacktestResults metrics={null} />
        </PanelBody>
      </Panel>
    </div>
  );
}
