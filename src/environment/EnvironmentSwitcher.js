import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEnvironment } from "./EnvironmentContext";
import EnvIconImage from "./EnvIcon";

const nameOf = (env) => env.env || env.value || env.label || "";
const sameEnv = (a, b) => nameOf(a) === nameOf(b) && a.src === b.src;

function EnvIcon({ env }) {
  return <EnvIconImage env={env} className="env-switch-icon" />;
}

// The environment button in the app bar and its menu: search, recent, all (A-Z), import.
// Opens over the page; picking an environment closes it. Nothing else on the page moves.
export default function EnvironmentSwitcher() {
  const { environments, environment, recent, selectEnvironment, clearEnvironment, removeEnvironment, openImport } = useEnvironment();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const current = environments.find((env) => sameEnv(env, environment)) || (environment.env ? environment : null);

  // Rows of the menu: Recent (only without a search), then all environments A-Z
  const sections = useMemo(() => {
    const term = query.trim().toLowerCase();
    const all = [...environments].sort((a, b) => nameOf(a).localeCompare(nameOf(b), undefined, { sensitivity: "base" }));
    if (term) {
      return [{ title: null, items: all.filter((env) => nameOf(env).toLowerCase().includes(term)) }];
    }
    const recentItems = recent
      .map((r) => environments.find((env) => nameOf(env) === r.env && env.src === r.src))
      .filter(Boolean);
    const out = [];
    if (recentItems.length > 0) out.push({ title: "Recent", items: recentItems });
    out.push({ title: recentItems.length > 0 ? "All environments" : null, items: all });
    return out;
  }, [environments, recent, query]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    if (!open) return undefined;
    setActive(0);
    if (searchRef.current) searchRef.current.focus();
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (env) => {
    close();
    selectEnvironment(env);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[active]) pick(flat[active]);
    }
  };

  let index = -1;
  return (
    <div className="env-switch" ref={rootRef}>
      <button
        type="button"
        className={"env-switch-button" + (open ? " open" : "")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <EnvIcon env={current} />
        <span className="env-switch-name">{nameOf(current)}</span>
        <span className="env-switch-caret" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="env-switch-menu" onKeyDown={onKeyDown}>
          <input
            ref={searchRef}
            type="text"
            className="env-switch-search"
            placeholder="Search environments…"
            aria-label="Search environments"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="env-switch-list" role="listbox" aria-label="Environments">
            {sections.map((section, si) => (
              <div key={section.title || `s${si}`} role="group" aria-label={section.title || "Environments"}>
                {section.title && <div className="env-switch-group">{section.title}</div>}
                {section.items.map((env) => {
                  index += 1;
                  const i = index;
                  const selected = current && sameEnv(env, current);
                  return (
                    <div
                      key={`${section.title}-${env.src}-${nameOf(env)}`}
                      role="option"
                      aria-selected={selected ? "true" : "false"}
                      className={"env-switch-item" + (i === active ? " active" : "") + (selected ? " selected" : "")}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(env)}
                    >
                      <EnvIcon env={env} />
                      <span className="env-switch-item-name">{nameOf(env)}</span>
                      {env.is_user_env && <span className="env-switch-tag">User</span>}
                      {selected && <span className="env-switch-check" aria-hidden="true">{"✓"}</span>}
                      {env.is_user_env && section.title !== "Recent" && (
                        <button
                          type="button"
                          className="env-switch-remove"
                          title={`Remove ${nameOf(env)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            close();
                            removeEnvironment(env);
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {flat.length === 0 && <div className="env-switch-empty">No environment matches "{query}".</div>}
          </div>
          <button
            type="button"
            className="env-switch-foot"
            onClick={() => {
              close();
              clearEnvironment();
            }}
          >
            All environments {"\u2192"}
          </button>
          {openImport && (
            <button
              type="button"
              className="env-switch-foot secondary"
              onClick={() => {
                close();
                openImport();
              }}
            >
              + Import an environment…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
