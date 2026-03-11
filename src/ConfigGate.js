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


  useEffect(() => {
    (async () => {
      try {
        if (!window.CONFIG_STATUS_URL) {
          console.error("ConfigGate: CONFIG_STATUS_URL is not defined on window");
          setAction("error");
          setReason("Configuration status URL not defined.");
          setLoading(false);
          return;
        }
        
        const r = await fetch(window.CONFIG_STATUS_URL, { credentials: "same-origin" });
        const j = await r.json();
        setAction(j.action);


        if (j.action === "migrated" && j.notice) {
            setNotice(j.notice);      
            setShowNotice(true);
        }
        if (j.action === "select_needed") {
          setReason(j.reason || "Configuration not found.");
          setCurrentDir("");
          props.onStatusChange(true);
        } else {
          setCurrentDir(j.drona_dir || "");
          props.onStatusChange(false);
        }
      } catch (e) {
        console.error("ConfigGate: status fetch failed:", e);
        setAction("error");
        setReason("Failed to check configuration status.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDronaPathChange(_index, selectedPath) {
      if (!selectedPath) { alert("No directory was selected."); return; }
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

    {loading || action !== "select_needed" ? null : (
      <div className="alert alert-warning" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Select directory where Drona will store workflow data and environments.</div>

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
