import React, { useEffect, useMemo, useState } from "react";
import { useEnvironment } from "./EnvironmentContext";
import EnvIcon from "./EnvIcon";

const nameOf = (env) => env.env || env.value || env.label || "";

const STATE_LABELS = {
  running: "Running", pending: "Pending", completed: "Completed", failed: "Failed", cancelled: "Cancelled",
};

// "just now", "3 h ago", "yesterday", "Nov 4" (start_time is the record's local ISO time)
export function whenText(iso, now = new Date()) {
  const t = new Date(iso);
  if (!iso || isNaN(t)) return "";
  const minutes = Math.floor((now - t) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && t.getDate() === now.getDate()) return `${hours} h ago`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (t.toDateString() === yesterday.toDateString()) return "yesterday";
  return t.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// The newest workflows (all environments) with one state each; [] while loading or on error.
// How many: recent_workflows in config.yml (the server's default when no limit is given).
function useRecentWorkflows() {
  const [workflows, setWorkflows] = useState([]);
  useEffect(() => {
    let alive = true;
    fetch(`${document.dashboard_url}/jobs/composer/history/recent`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (alive && Array.isArray(data)) setWorkflows(data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return workflows;
}

// Shown when no environment is selected: search, every environment as a card (A-Z) with its
// category and description from manifest.yml, and the recent workflows. Picking a card opens it.
export default function StartPage() {
  const { environments, selectEnvironment, removeEnvironment, openImport } = useEnvironment();
  const [query, setQuery] = useState("");
  const recentWorkflows = useRecentWorkflows();

  // The environment that lists every workflow (if installed)
  const historyEnv = environments.find((env) => nameOf(env) === "WorkflowHistory");

  // The server already returns only workflows of installed environments; this also covers an
  // environment removed since the page loaded
  const workflowRows = recentWorkflows
    .map((wf) => ({ wf, env: environments.find((env) => nameOf(env) === wf.environment) }))
    .filter((row) => row.env);

  // Open the workflow's environment in Manage with this workflow picked. Uses the field names of
  // the shared create/manage component; other environments just open.
  const openWorkflow = ({ wf, env }) =>
    selectEnvironment(env, {
      values: {
        drona_create_manage_mode: "manage",
        drona_create_manage_allworkflows: { value: wf.drona_id, label: wf.name },
      },
    });

  const sorted = useMemo(
    () => [...environments].sort((a, b) => nameOf(a).localeCompare(nameOf(b), undefined, { sensitivity: "base" })),
    [environments]
  );

  const term = query.trim().toLowerCase();
  const shown = term
    ? sorted.filter((env) =>
        [nameOf(env), env.category, env.description].some((t) => (t || "").toLowerCase().includes(term)))
    : sorted;

  const onSearchKey = (e) => {
    if (e.key === "Enter" && shown.length === 1) selectEnvironment(shown[0]);
  };

  return (
    <section className="start-page" aria-label="Choose an environment">
      <div className="start-head">
        <h2 className="start-title">Available Environments</h2>
        <input
          type="search"
          className="start-search"
          placeholder="Search by name, category or description…"
          aria-label="Search environments by name, category or description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
        />
      </div>

      <div className="start-grid">
        {shown.map((env) => (
          <div key={`${env.src}-${nameOf(env)}`} className={"start-card" + (env.is_user_env ? " user" : "")}>
            <button
              type="button"
              className="start-card-open"
              onClick={() => selectEnvironment(env)}
              title={env.description || undefined}
            >
              <span className="start-card-top">
                <EnvIcon env={env} className="start-card-icon" />
                <span className="start-card-name">{nameOf(env)}</span>
              </span>
              <span className="start-card-tags">
                {env.category && <span className="start-tag">{env.category}</span>}
                {env.is_user_env && <span className="start-tag user">User</span>}
              </span>
              <span className={"start-card-desc" + (env.description ? "" : " none")}>
                {env.description || "No description."}
              </span>
            </button>
            {env.is_user_env && (
              <button
                type="button"
                className="start-card-remove"
                onClick={() => removeEnvironment(env)}
                aria-label={`Remove ${nameOf(env)}`}
                title={`Remove ${nameOf(env)}`}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        {openImport && !term && (
          <button type="button" className="start-card start-card-import" onClick={openImport}>
            <span className="start-import-plus" aria-hidden="true">+</span>
            <span className="start-card-name">Import an environment</span>
            <span className="start-card-desc">Add one from the environment repository.</span>
          </button>
        )}
      </div>

      {shown.length === 0 && (
        <p className="start-empty">No environment matches "{query}".</p>
      )}

      {!term && workflowRows.length > 0 && (
        <div className="start-workflows">
          <h3 className="start-section-title">Recent Workflows</h3>
          <ul className="start-wf-list">
            {workflowRows.map((row) => (
              <li key={row.wf.drona_id}>
                <button
                  type="button"
                  className="start-wf"
                  onClick={() => openWorkflow(row)}
                  title={`Open ${row.wf.name} in ${row.wf.environment} (Manage)`}
                >
                  <EnvIcon env={row.env} className="start-wf-icon" />
                  <span className="start-wf-name">{row.wf.name}</span>
                  <span className="start-wf-env">{row.wf.environment}</span>
                  <span className={"start-wf-state " + (row.wf.state || "unknown")}>
                    {STATE_LABELS[row.wf.state] || (row.wf.state ? row.wf.state : "\u2014")}
                  </span>
                  <span className="start-wf-when">{whenText(row.wf.start_time)}</span>
                </button>
              </li>
            ))}
          </ul>
          {historyEnv && (
            <button type="button" className="start-wf-all" onClick={() => selectEnvironment(historyEnv)}>
              Show all workflows {"\u2192"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
