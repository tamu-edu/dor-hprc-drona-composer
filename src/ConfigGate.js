import React, { useEffect, useState } from "react";
import Picker from "./schemaRendering/schemaElements/Picker";

const COMPOSER_BASE = () =>
  `${typeof document !== "undefined" && document.dashboard_url
    ? document.dashboard_url
    : ""}/jobs/composer`;

export function getConfigStatusUrl() {
  if (typeof window !== "undefined" && window.CONFIG_STATUS_URL) {
    return window.CONFIG_STATUS_URL;
  }
  return `${COMPOSER_BASE()}/api/config/status`;
}

export function getConfigSaveUrl() {
  if (typeof window !== "undefined" && window.CONFIG_SAVE_URL) {
    return window.CONFIG_SAVE_URL;
  }
  return `${COMPOSER_BASE()}/api/config/save`;
}

export async function fetchDronaConfigStatus() {
  const response = await fetch(getConfigStatusUrl(), { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Failed to fetch config status (${response.status})`);
  }
  return response.json();
}

export async function saveDronaDir(selectedPath) {
  const response = await fetch(getConfigSaveUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ drona_dir: selectedPath }),
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export function getDronaWfeTargetPath(parentPath) {
  const normalized = (parentPath || "").replace(/\/+$/, "");
  return normalized ? `${normalized}/drona_wfe` : "";
}

export default function ConfigGate(props) {
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState(null);
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const j = await fetchDronaConfigStatus();
        setAction(j.action);

        if (j.action === "migrated" && j.notice) {
          setNotice(j.notice);
          setShowNotice(true);
        }
        if (j.action === "select_needed") {
          setReason(j.reason || "Configuration not found.");
          props.onStatusChange(true);
        } else {
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
    if (!selectedPath) {
      alert("No directory was selected.");
      return;
    }

    const { ok, status, data } = await saveDronaDir(selectedPath);
    if (ok && data.status === "ok") {
      window.location.reload();
    } else {
      alert(data.message || data.error || `Save failed (${status})`);
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
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Select directory where Drona will store workflow data and environments.
          </div>

          <div className="drona-dir-picker">
            <Picker
              name="dronaDirPicker"
              label=""
              localLabel="Select"
              showFiles={false}
              defaultLocation=""
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
