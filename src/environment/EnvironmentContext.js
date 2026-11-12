import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Which environments exist and which one is selected. Owned here, outside the workflow pane,
// so the environment sidebar, the header and the workflow pane are separate parts: each reads
// the selection from this context; the workflow pane reacts to a new selection on its own.

const EnvironmentContext = createContext(null);

// Installer setting (env_import_enabled in config.yml, set by layout.html); missing = enabled
export const envImportEnabled = () => document.env_import_enabled !== false;

const EMPTY = { env: "", src: "" };

function toListEntry(env) {
  return {
    value: env.env,
    label: env.env,
    src: env.src,
    is_user_env: env.is_user_env,
    styles: { color: env.is_user_env ? "#3B71CA" : "" },
    icon: env.icon,
    description: env.description || "",
    category: env.category || "",
  };
}

// Keep ?environment= in step with the selected environment, so a reload or shared link opens it
// (an empty name removes it: no environment selected)
function setEnvironmentInUrl(envName) {
  const params = new URLSearchParams(window.location.search);
  if ((params.get("environment") || "") === envName) return;
  if (envName) params.set("environment", envName);
  else params.delete("environment");
  const query = params.toString();
  window.history.pushState({}, "", `${window.location.pathname}${query ? "?" + query : ""}`);
}

const RECENT_KEY = "drona.recentEnvironments";
const RECENT_MAX = 3;

function readRecent() {
  try {
    const list = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

// Most recently selected environments first, as {env, src}; remembered in this browser only
function rememberRecent(name, src) {
  const next = [{ env: name, src }, ...readRecent().filter((r) => !(r.env === name && r.src === src))].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch (e) {
    // storage unavailable: no recent list
  }
  return next;
}

export function EnvironmentProvider({ children, initialEnvironments = null }) {
  const [environments, setEnvironments] = useState(initialEnvironments || []);
  const [environment, setEnvironment] = useState(EMPTY);
  // Bumped on every selection from the list, so the workflow form gets a fresh mount even when
  // the same environment is picked again (fields that fetch once on mount re-run).
  const [envInstanceId, setEnvInstanceId] = useState(0);
  // The import dialog lives in the app shell; anything can open it through openImport().
  const importModalRef = useRef(null);
  const [recent, setRecent] = useState(readRecent);
  // Form values to fill in once the selected environment's form is there (e.g. a recent
  // workflow opens in Manage with that workflow picked). Read by the workflow pane.
  const [initialValues, setInitialValues] = useState(null);

  useEffect(() => {
    if (initialEnvironments) return;
    fetch(document.dashboard_url + "/jobs/composer/environments")
      .then((response) => response.json())
      .then((data) => setEnvironments(data.map(toListEntry)))
      .catch(() => console.error("Error fetching JSON data"));
  }, [initialEnvironments]);

  // Pick an environment. remount=false keeps the form instance (Recreate switches environments
  // itself and then fills the form in). values: form values to apply once the form is there.
  const selectEnvironment = useCallback((option, { remount = true, values = null } = {}) => {
    const name = option.env || option.value || option.label || "";
    setEnvironment({ env: name, src: option.src, icon: option.icon, is_user_env: option.is_user_env });
    setInitialValues(values);
    if (remount) setEnvInstanceId((id) => id + 1);
    if (name) {
      setEnvironmentInUrl(name);
      setRecent(rememberRecent(name, option.src));
    }
  }, []);

  // No environment selected (the "Drona" home link)
  const clearEnvironment = useCallback(() => {
    setEnvironment(EMPTY);
    setEnvironmentInUrl("");
  }, []);

  // ?environment= on load opens that environment once the list is known
  useEffect(() => {
    const envName = new URLSearchParams(window.location.search).get("environment");
    if (!envName || environments.length === 0) return;
    const match = environments.find((env) => env.value === envName);
    if (match) selectEnvironment(match);
  }, [environments]); // eslint-disable-line react-hooks/exhaustive-deps

  const addEnvironment = useCallback((newEnv) => {
    const newName = newEnv.env || newEnv.value || newEnv.label;
    setEnvironments((prev) => {
      const exists = prev.some((env) => (env.env || env.value || env.label) === newName && env.src === newEnv.src);
      if (exists) return prev;
      return [...prev, toListEntry({ env: newName, src: newEnv.src, is_user_env: true, icon: newEnv.icon })];
    });
  }, []);

  const removeEnvironment = useCallback(async (env) => {
    const name = env.env || env.value || env.label;
    if (!env.is_user_env) {
      alert("System environments cannot be removed.");
      return;
    }
    if (!window.confirm(`Remove environment "${name}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`${document.dashboard_url}/jobs/composer/environment`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ env: name, src: env.src }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.details?.error || "Failed to remove environment.");
      }
      setEnvironments((prev) => prev.filter((item) => !((item.env || item.value || item.label) === name && item.src === env.src)));
      setEnvironment((current) => {
        if (current.env === name && current.src === env.src) {
          setEnvironmentInUrl("");
          return EMPTY;
        }
        return current;
      });
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to remove environment.");
    }
  }, []);

  const openImport = useCallback(() => {
    if (!importModalRef.current) return;
    // eslint-disable-next-line no-undef
    const modal = new bootstrap.Modal(importModalRef.current);
    modal.toggle();
  }, []);

  const value = useMemo(() => ({
    environments,
    environment,
    envInstanceId,
    recent,
    initialValues,
    selectEnvironment,
    clearEnvironment,
    addEnvironment,
    removeEnvironment,
    openImport: envImportEnabled() ? openImport : undefined,
    importModalRef,
  }), [environments, environment, envInstanceId, recent, initialValues, selectEnvironment, clearEnvironment, addEnvironment, removeEnvironment, openImport]);

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}

export function useEnvironment() {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error("useEnvironment must be used inside <EnvironmentProvider>");
  return ctx;
}
