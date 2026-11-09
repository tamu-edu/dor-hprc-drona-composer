import React, { useEffect, useState } from "react";
import Picker from "./schemaRendering/schemaElements/Picker";
import ErrorAlert from "./ErrorAlert";

export default function ConfigGate(props) {
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [currentDir, setCurrentDir] = useState("");
  const [notice, setNotice] = useState(null);
  const [showNotice, setShowNotice] = useState(false);

  const migrationNoticeKey = "dronaMigrationNotice";


  useEffect(() => {
    props.onStatusChange(true);

    (async () => {
      try {
        if (!window.CONFIG_STATUS_URL) {
          console.error("ConfigGate: CONFIG_STATUS_URL is not defined on window");
          setAction("error");
          setReason("Configuration status URL not defined.");
          return;
        }
        
        const r = await fetch(window.CONFIG_STATUS_URL, { credentials: "same-origin" });
        const j = await r.json();

        if (!r.ok) {
          throw new Error(j.reason || `Configuration status failed (${r.status})`);
        }

        setAction(j.action);

        if (j.action === "migrated") {
          if (j.notice) {
            try {
              window.sessionStorage.setItem(migrationNoticeKey, j.notice);
            } catch (storageError) {
              console.warn("ConfigGate: could not preserve migration notice", storageError);
            }
          }

          // The current HTML was rendered before migration and therefore has a
          // null/stale document.drona_dir. Render it again from the new config.
          window.location.reload();
          return;
        }

        if (j.action === "ok") {
          try {
            const savedNotice = window.sessionStorage.getItem(migrationNoticeKey);
            if (savedNotice) {
              setNotice(savedNotice);
              setShowNotice(true);
              window.sessionStorage.removeItem(migrationNoticeKey);
            }
          } catch (storageError) {
            console.warn("ConfigGate: could not restore migration notice", storageError);
          }
        }

        if (j.action === "select_needed") {
          setReason(j.reason || "Configuration not found.");
          setCurrentDir("");
          props.onStatusChange(true);
        } else if (j.action === "ok") {
          setCurrentDir(j.drona_dir || "");
          props.onStatusChange(false);
        } else {
          setAction("error");
          setReason(j.reason || "Configuration could not be verified.");
          props.onStatusChange(true);
        }
      } catch (e) {
        console.error("ConfigGate: status fetch failed:", e);
        setAction("error");
        setReason(e.message || "Failed to check configuration status.");
        props.onStatusChange(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDronaPathChange(_index, selectedPath) {
      if (!selectedPath) { alert("No directory was selected."); return; }
      if (!window.CONFIG_SAVE_URL) { alert("Configuration save URL not defined."); return; }
      const resp = await fetch(window.CONFIG_SAVE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ drona_dir: selectedPath }),
      });
      const out = await resp.json().catch(() => ({}));
      if (resp.ok && out.status === "ok") {
        window.location.reload();
      } else {
        alert(out.message || out.error || `Save failed (${resp.status})`);
      }
    }
    

  return (
  <>
    {showNotice && notice && (
      <div
        className="alert alert-warning alert-dismissible"
        role="alert"
        style={{ marginBottom: 12 }}
      >
        <strong>Warning:</strong> {notice}
        <button
          type="button"
          className="close"
          onClick={() => setShowNotice(false)}
          style={{ marginLeft: 8 }}
        >
          ×
        </button>
      </div>
    )}

    {!loading && action === "error" && (
      <div className="alert alert-danger" role="alert" style={{ marginBottom: 12 }}>
        <strong>Configuration error:</strong> {reason || "Configuration could not be verified."}
      </div>
    )}

    {loading || action !== "select_needed" ? null : (
      <div className="alert alert-warning" style={{ marginBottom: 12 }}>
        {reason && (
          <div role="status" style={{ marginBottom: 10 }}>
            {reason}
          </div>
        )}
        <div style={{ fontWeight: "var(--drona-weight-strong)", marginBottom: 6 }}>
          Choose where Drona should create its <code>drona_wfe</code> folder.
        </div>
        <div style={{ marginBottom: 10 }}>
          Selecting a parent directory creates or reuses <code>drona_wfe</code> inside it.
          Selecting an existing folder named <code>drona_wfe</code> uses that folder directly.
        </div>

        <div className="drona-dir-picker">
          <Picker
            name="dronaDirPicker"
            label=""
            localLabel="Select"
            showFiles={false}
            defaultLocation={""}
            defaultPaths={{ Home: "/home/$USER", Scratch: "/scratch/user/$USER" }}
            useHPCDefaultPaths={true}
            onChange={(_, v) => handleDronaPathChange(_, v)}
            index={0}
          />
        </div>
      </div>
    )}
  </>
);
}
