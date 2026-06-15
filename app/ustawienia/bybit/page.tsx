import { ApiKeyForm } from "@/src/features/portfolio/components/api-key-form";
import { TerminalPage, TerminalShell } from "@/src/components/terminal/terminal-shell";
import { Panel, PanelBody, PanelHeader } from "@/src/components/terminal/panel";

export default function BybitSettingsPage() {
  return (
    <TerminalShell>
      <TerminalPage>
        <div className="grid min-h-full gap-1 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Panel>
            <PanelHeader title="Bybit API setup" subtitle="Read-only credentials for portfolio tracking" />
            <PanelBody className="space-y-3 text-xs text-[#c9d1d9]">
              <div className="border border-[#2b3139] bg-[#161b22] p-2">
                <div className="font-semibold text-[#eaecef]">What to paste here</div>
                <p className="mt-1 leading-relaxed text-[#848e9c]">
                  Wklej API Key i API Secret utworzone na Bybit z uprawnieniami read-only. Nie dodawaj ich do `.env`.
                </p>
              </div>
              <div className="border border-[#2b3139] bg-[#161b22] p-2">
                <div className="font-semibold text-[#eaecef]">After saving</div>
                <p className="mt-1 leading-relaxed text-[#848e9c]">
                  Przejdź do My Positions i kliknij Synchronizuj. Worker odświeża dane automatycznie co około minutę.
                </p>
              </div>
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader title="Credentials" subtitle="Secrets are encrypted server-side and never returned to UI" />
            <PanelBody>
              <ApiKeyForm />
            </PanelBody>
          </Panel>
        </div>
      </TerminalPage>
    </TerminalShell>
  );
}
