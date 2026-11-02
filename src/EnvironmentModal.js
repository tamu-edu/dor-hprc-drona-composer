import React, { useState, useEffect, useRef } from 'react';
import * as M from './styles/modalStyles';
import { COLORS } from './styles/modalStyles';

const EnvironmentModal = ({ envModalRef, onAddEnvironment, setError, installedEnvNames }) => {
  const [environments, setEnvironments] = useState([]);
  const [filteredEnvironments, setFilteredEnvironments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // Installed names as of the last list load: an environment added while the dialog is open stays in place
  // (marked Installed) instead of jumping into the Installed group
  const installedRef = useRef(installedEnvNames || []);
  installedRef.current = installedEnvNames || [];
  const [installedAtLoad, setInstalledAtLoad] = useState(new Set());

  useEffect(() => {
    const modal = envModalRef?.current;
    if (!modal) return;

    const handleModalShow = () => {
      loadEnvironments();
    };

    modal.addEventListener('show.bs.modal', handleModalShow);
    modal.addEventListener('shown.bs.modal', handleModalShow);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' &&
            modal.classList.contains('show')) {
          loadEnvironments();
        }
      });
    });

    observer.observe(modal, { attributes: true });

    return () => {
      modal.removeEventListener('show.bs.modal', handleModalShow);
      modal.removeEventListener('shown.bs.modal', handleModalShow);
      observer.disconnect();
    };
  }, [envModalRef]);

  useEffect(() => {
    if (!environments.length) return;

    // Search matches name, description, category, organization and cluster (e.g. "bio", "aces")
    const term = searchTerm.trim().toLowerCase();
    const filtered = term === '' ? environments : environments.filter(env =>
      [env.env, env.description, env.category, env.organization, env.cluster]
        .some(value => knownValue(value) && String(value).toLowerCase().includes(term))
    );

    setFilteredEnvironments(filtered);
  }, [searchTerm, environments]);

  const loadEnvironments = () => {
    setIsLoading(true);
    setLoadError(null);

    const url = document.dashboard_url + "/jobs/composer/get_more_envs_info";
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          // The server explains in details.error (e.g. 403 when import is turned off)
          return response.json().catch(() => null).then((body) => {
            const reason = body && body.details && body.details.error;
            setLoadError(reason || `Could not load environments (HTTP ${response.status}).`);
            throw new Error(`HTTP error! Status: ${response.status}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          setIsLoading(false);
          return;
        }

        setInstalledAtLoad(new Set(installedRef.current));
        setEnvironments(data);
        setFilteredEnvironments(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching environment data:", error);
        setIsLoading(false);
      });
  };
 

  const handleAddEnvironment = (env) => {
    const formData = new FormData();
    formData.append("env", env.env);
    formData.append("src", env.src);

    return fetch(document.dashboard_url + "/jobs/composer/add_environment", {
      method: "POST",
      body: formData,
    })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "Success") {
        const newEnv = {
          value: env.env,
          label: env.env,
          src: env.src,
          styles: { color: "#3B71CA" },
        };
        onAddEnvironment && onAddEnvironment(newEnv);
        return { success: true };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to add environment',
          status_code: data.status,
          // details_obj.error is the readable reason (e.g. the 409 "needs a newer Drona" message)
          details_obj: data.details || null,
          details: JSON.stringify(data.details || data,  null, 2)
        };
      }
  })
  .catch((error) => {
      console.error("Environment add failed:", error);
      return {
        success: false,
        message: error.message || "Unknown error occurred",
      	details: "Unknown Error"
      };
	  
    });
  }
	
  // Missing "compatible" (older server) counts as compatible
  const compatibleEnvironments = filteredEnvironments.filter(env => env.compatible !== false);
  const incompatibleEnvironments = filteredEnvironments.filter(env => env.compatible === false);
  const availableEnvironments = compatibleEnvironments.filter(env => !installedAtLoad.has(env.env));
  const installedEnvironments = compatibleEnvironments
    .filter(env => installedAtLoad.has(env.env))
    .sort((a, b) => a.env.localeCompare(b.env));

  const resetFilters = () => setSearchTerm('');
  const isSearching = searchTerm.trim() !== '';
  const hiddenMatches = installedEnvironments.length + incompatibleEnvironments.length;

  const installed = new Set(installedEnvNames || []);

  return (
    <div ref={envModalRef} className="modal fade bd-example-modal-lg" id="env-add-modal" tabIndex="-1" role="dialog" aria-labelledby="env-add-modal-label" aria-hidden="true">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header" style={{ position: "sticky", top: "0", zIndex: "3", alignItems: "center" }}>
            <h5 className="modal-title" id="env-add-modal-label">Import Environments</h5>
            <div style={M.headerBtnRow}>
              <button type="button" style={M.cancelBtn} data-dismiss="modal">
                Close
              </button>
            </div>
          </div>
          <div className="modal-body">
            <input
              type="text"
              style={{ ...M.textInput, marginBottom: "10px" }}
              placeholder="Search environments..."
              aria-label="Search environments"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="alert alert-info py-1 px-2" style={S.notice} role="note">
              <i className="fas fa-info-circle mr-2" style={S.noticeIcon} aria-hidden="true"></i>
              <span>{CLUSTER_NOTICE}</span>
            </div>

            {loadError ? (
              <div style={{ ...M.list, ...S.listBox }}>
                <div style={M.emptyState} role="alert">{loadError}</div>
              </div>
            ) : isLoading ? (
              <div style={{ ...M.list, ...S.listBox }}>
                <div style={M.emptyState}>
                  <span className="spinner-border spinner-border-sm mr-2" style={M.spinner} role="status" aria-hidden="true"></span>
                  Loading environments&hellip;
                </div>
              </div>
            ) : (
              <>
                {filteredEnvironments.length === 0 ? (
                  <div style={{ ...M.list, ...S.listBox }}>
                    <div style={M.emptyState}>
                      No environments match these filters.{" "}
                      <button type="button" className="btn btn-link p-0 align-baseline" style={{ fontSize: "13px", color: COLORS.maroon }} onClick={resetFilters}>
                        Reset filters
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {availableEnvironments.length > 0 ? (
                      <div style={{ ...M.list, ...S.listBox }}>
                        {groupByCategory(availableEnvironments).map(([category, envs]) => (
                          <div key={category} role="group" aria-label={category}>
                            <div style={S.groupHeader}>
                              {category}<span style={S.groupCount}> · {envs.length}</span>
                            </div>
                            {envs.map((env) => (
                              <EnvironmentRow
                                key={env.env}
                                env={env}
                                isInstalled={installed.has(env.env)}
                                onAddEnvironment={handleAddEnvironment}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...M.list, ...S.listBox }}>
                        <div style={M.emptyState}>
                          {isSearching && hiddenMatches > 0
                            ? "No new environments match. Matches are shown in the sections below."
                            : "No new environments to add."}
                        </div>
                      </div>
                    )}
                    <CollapsibleGroup title="Installed" envs={installedEnvironments} autoOpen={isSearching}>
                      {(env) => <EnvironmentRow key={env.env} env={env} isInstalled />}
                    </CollapsibleGroup>
                    <CollapsibleGroup title="Requires a newer Drona" envs={incompatibleEnvironments} autoOpen={isSearching}>
                      {(env) => <EnvironmentRow key={env.env} env={env} isInstalled={installed.has(env.env)} />}
                    </CollapsibleGroup>
                  </>
                )}

                <div style={{ ...M.hint, marginTop: "8px" }}>
                  Showing {filteredEnvironments.length} of {environments.length} environments
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Shown above the list
const CLUSTER_NOTICE =
  "Environments are designed to work on most clusters, unless indicated otherwise. On some clusters an environment " +
  "may need adjustments, for example to modules, partitions or accounts.";

// The server fills missing metadata with "Unknown"; treat that like a missing value
const knownValue = (value) => value != null && value !== '' && value !== 'Unknown';

// [[category, envs], ...] sorted by category name, "Other" last; envs sorted by name
function groupByCategory(envs) {
  const groups = {};
  envs.forEach((env) => {
    const category = knownValue(env.category) && env.category !== 'Uncategorized' ? env.category : 'Other';
    (groups[category] = groups[category] || []).push(env);
  });
  return Object.keys(groups)
    .sort((a, b) => (a === 'Other') - (b === 'Other') || a.localeCompare(b))
    .map((category) => [category, groups[category].sort((a, b) => a.env.localeCompare(b.env))]);
}

// Import-dialog specifics on top of the shared dialog styles
const S = {
  listBox: { maxHeight: "420px", minHeight: "60px" },
  row: { ...M.row(false), cursor: "default", alignItems: "flex-start", gap: "12px", padding: "8px 12px" },
  rowMain: { flex: 1, minWidth: 0 },
  titleLine: { display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "8px" },
  name: { fontWeight: "600", color: COLORS.text, fontSize: "13px" },
  versionPill: {
    fontSize: "11px", padding: "0 6px", borderRadius: "9px",
    border: `1px solid ${COLORS.border}`, color: COLORS.muted, lineHeight: "16px",
  },
  meta: { fontSize: "12px", color: COLORS.muted },
  description: {
    fontSize: "12px", color: COLORS.textSecondary, marginTop: "2px",
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  reason: { fontSize: "12px", color: COLORS.folder, marginTop: "4px" },
  action: { flexShrink: 0, display: "flex", alignItems: "center", minHeight: "26px" },
  installed: { fontSize: "12px", color: COLORS.muted, fontWeight: "500" },
  rowError: { fontSize: "12px", marginTop: "6px", marginBottom: 0 },
  detailsToggle: { fontSize: "12px", color: COLORS.maroon, padding: 0, marginLeft: "6px", verticalAlign: "baseline" },
  details: { fontSize: "11px", marginTop: "4px", marginBottom: 0, maxHeight: "160px", overflow: "auto", whiteSpace: "pre-wrap" },
  // Colors come from Bootstrap's alert-info (same as the Preview and Rerun/Recreate notes); compact layout here
  notice: { display: "flex", alignItems: "flex-start", fontSize: "12px", marginBottom: "10px" },
  noticeIcon: { marginTop: "2px" },
  groupHeader: {
    position: "sticky", top: 0, zIndex: 1,
    backgroundColor: COLORS.barBg, borderBottom: `1px solid ${COLORS.border}`,
    padding: "4px 12px", fontSize: "11px", fontWeight: "600", letterSpacing: "0.03em",
    textTransform: "uppercase", color: COLORS.textSecondary,
  },
  groupCount: { fontWeight: "400", color: COLORS.muted },
  // Section toggle: maroon and white (not a grey bar) so it doesn't read as a static heading like the category headers
  groupToggle: (hover) => ({
    display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", cursor: "pointer",
    padding: "6px 10px", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: COLORS.maroon,
    backgroundColor: hover ? COLORS.rowHover : "white",
    border: "none", borderTop: `1px solid ${COLORS.border}`, borderRadius: 0,
  }),
  groupChevron: { fontSize: "12px", color: COLORS.maroon, width: "12px", flexShrink: 0 },
  groupToggleCount: {
    fontSize: "11px", fontWeight: "400", padding: "0 6px", borderRadius: "9px",
    border: `1px solid ${COLORS.border}`, color: COLORS.muted, lineHeight: "16px",
  },
  groupToggleAction: { marginLeft: "auto", fontSize: "12px", fontWeight: "400", color: COLORS.maroon },
};

// Collapsed-by-default section below the main list (Installed, Requires a newer Drona); hidden when empty.
// autoOpen (a search is active) opens it while it has matches, so a match is never hidden in a closed section;
// it closes again when the search is cleared unless the user toggled it in the meantime.
const CollapsibleGroup = ({ title, envs, autoOpen, children }) => {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const autoOpened = useRef(false);
  const shouldAutoOpen = !!autoOpen && envs.length > 0;

  useEffect(() => {
    if (shouldAutoOpen && !open) {
      setOpen(true);
      autoOpened.current = true;
    } else if (!shouldAutoOpen && autoOpened.current) {
      setOpen(false);
      autoOpened.current = false;
    }
  }, [shouldAutoOpen]);

  if (!envs.length) return null;
  const toggle = () => {
    autoOpened.current = false;
    setOpen(!open);
  };
  return (
    <div style={{ marginTop: "10px" }}>
      <button
        type="button"
        style={S.groupToggle(hover)}
        aria-expanded={open}
        aria-label={`${title} (${envs.length})`}
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <i className={"fas " + (open ? "fa-chevron-down" : "fa-chevron-right")} style={S.groupChevron} aria-hidden="true"></i>
        {title}
        <span style={S.groupToggleCount}>{envs.length}</span>
        <span style={S.groupToggleAction} aria-hidden="true">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <div style={{ ...M.list, ...S.listBox }}>{envs.map(children)}</div>}
    </div>
  );
};

// One environment: name, version, category/organization, description, and the Add action.
// Without onAddEnvironment (incompatible environments) the row is shown dimmed with the reason.
const EnvironmentRow = ({ env, isInstalled, onAddEnvironment }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [error, setRowError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const incompatible = env.compatible === false;

  const handleClick = () => {
    if (isAdded || isAdding) return;
    setIsAdding(true);
    setRowError(null);
    onAddEnvironment(env)
      .then((result) => {
        setIsAdding(false);
        if (result.success) {
          setIsAdded(true);
        } else {
          setRowError(result);
        }
      })
      .catch((err) => {
        setIsAdding(false);
        console.error("Error adding environment:", err);
        setRowError({ message: "Error adding environment. See the browser console for details." });
      });
  };

  // Category is the group header, so the row only names the organization and a specific cluster
  const meta = [...new Set([env.organization, env.cluster].filter(knownValue))].join(' · ');

  let action;
  if (incompatible) {
    action = isInstalled ? <span style={S.installed}><i className="fas fa-check mr-1" aria-hidden="true"></i>Installed</span> : null;
  } else if (isAdding) {
    action = (
      <button type="button" style={M.primaryBtn(true)} disabled>
        <span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true"></span>
        Adding&hellip;
      </button>
    );
  } else if (isAdded || isInstalled) {
    action = <span style={S.installed}><i className="fas fa-check mr-1" aria-hidden="true"></i>Installed</span>;
  } else {
    action = (
      <button type="button" style={M.primaryBtn(false)} onClick={handleClick} aria-label={`Add ${env.env}`}>
        Add
      </button>
    );
  }

  return (
    <div style={{ ...S.row, opacity: incompatible ? 0.65 : 1 }}>
      <div style={S.rowMain}>
        <div style={S.titleLine}>
          <span style={S.name}>{env.env}</span>
          {env.version && <span style={S.versionPill}>v{env.version}</span>}
          {meta && <span style={S.meta}>{meta}</span>}
        </div>
        {env.description && (
          <div style={S.description} title={env.description}>{env.description}</div>
        )}
        {incompatible && env.incompatible_reason && (
          <div style={S.reason}>
            <i className="fas fa-exclamation-triangle mr-1" aria-hidden="true"></i>
            {env.incompatible_reason}
          </div>
        )}
        {error && (
          <div className="alert alert-danger py-1 px-2" role="alert" style={S.rowError}>
            {(error.details_obj && error.details_obj.error) || error.message || "Failed to add environment"}
            {error.details && (
              <button type="button" className="btn btn-link" style={S.detailsToggle} onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? "Hide details" : "Details"}
              </button>
            )}
            {showDetails && error.details && <pre style={S.details}>{error.details}</pre>}
          </div>
        )}
      </div>
      <div style={S.action}>{action}</div>
    </div>
  );
};

export default EnvironmentModal;
