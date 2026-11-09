import React, { useState } from "react";
import ConfigGate from "./ConfigGate";
import EnvironmentSwitcher from "./environment/EnvironmentSwitcher";
import StartPage from "./environment/StartPage";
import EnvironmentModal from "./EnvironmentModal";
import Footer from "./Footer";
import { useEnvironment } from "./environment/EnvironmentContext";
import "./styles/JobComposerEnvSplitStyles.js";

const DOCS_URL = "https://tamu-edu.github.io/dor-hprc-drona-composer/";

// The bar on top of every Drona view: "All environments" (the start page), the environment
// switcher once an environment is open (the start page already lists them all), and app-wide
// links. Later it can also hold controls a form puts there (mode tabs).
export function AppBar() {
  const { clearEnvironment, openImport, environment } = useEnvironment();
  return (
    <nav className="drona-appbar" aria-label="Drona">
      <button type="button" className="drona-appbar-home" onClick={clearEnvironment} title="Back to the list of all environments">
        <span className="drona-appbar-home-icon" aria-hidden="true">{"\u25a6"}</span>
        All environments
      </button>
      {environment.env && (
        <>
          <span className="drona-appbar-sep" aria-hidden="true">{"\u203a"}</span>
          <EnvironmentSwitcher />
        </>
      )}
      <span className="drona-appbar-spacer" />
      {openImport && (
        <button type="button" className="drona-appbar-link" onClick={openImport}>
          Import environment
        </button>
      )}
      <a className="drona-appbar-link" href={DOCS_URL} target="_blank" rel="noopener noreferrer">
        Help
      </a>
    </nav>
  );
}

// Page frame: config gate, the app bar, the start page (no environment selected) or the workflow
// pane (full width), footer, and the environment import dialog. The workflow pane is passed in and renders on its own; it gets the
// selected environment from the environment context.
export default function AppShell({ children }) {
  const { addEnvironment, importModalRef, openImport, environments, environment } = useEnvironment();
  const hasEnvironment = !!environment.env;
  const [configBlocked, setConfigBlocked] = useState(true);

  return (
    // The page is the only scroller: no max-height/overflow scroll area here, so the sticky
    // environment pane and Generate bar stick to the window. overflow-x: clip hides sideways
    // overflow without creating a scroll area (hidden would).
    <div className="job-composer-container" style={{ width: "100%", maxWidth: "100%", overflowX: "clip", display: "flex", flexDirection: "column" }}>
      <div className="card shadow" style={{ width: "100%", maxWidth: "100%", display: "flex", flexDirection: "column" }}>
        <div className="card-body" style={{ flex: "1 1 auto" }}>
          <ConfigGate onStatusChange={setConfigBlocked} />

          {!configBlocked && (
            <>
              <AppBar />
              {!hasEnvironment && <StartPage />}
              {/* Kept mounted (only hidden) on the start page, so a run's console keeps going */}
              <main className="composer-form-pane" hidden={!hasEnvironment}>{children}</main>

              <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                <Footer />
              </div>
            </>
          )}
        </div>
      </div>

      {openImport && (
        <EnvironmentModal
          envModalRef={importModalRef}
          onAddEnvironment={addEnvironment}
          installedEnvNames={environments.filter((e) => e.is_user_env).map((e) => e.value || e.env)}
        />
      )}
    </div>
  );
}
