import React, { useContext, useEffect, useMemo, useState } from "react";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "../utils/fieldUtils";

function getRecordId(row) {
  return String(
    row?.job_id ??
    row?.drona_id ??
    row?.drona_job_id ??
    row?.form_data?.job_id ??
    row?.form_data?.drona_id ??
    row?.form_data?.drona_job_id ??
    ""
  ).replace(/^"|"$/g, "");
}

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).replace(/^"|"$/g, "");
  }

  if (typeof value === "object") {
    return String(
      value.value ??
      value.job_id ??
      value.drona_id ??
      value.drona_job_id ??
      value.id ??
      ""
    ).replace(/^"|"$/g, "");
  }

  return "";
}

export default function WorkflowRerunRecreate(props) {
  const { values: formValues, updateValue } = useContext(FormValuesContext);

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const workflowField = props.workflowField || "allworkflows";

  const selectedId = normalizeValue(
    getFieldValue(formValues, workflowField)
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${document.dashboard_url}/jobs/composer/history`,
          {
            credentials: "same-origin"
          }
        );

        if (!response.ok) {
          throw new Error(
            `History request failed: ${response.status}`
          );
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];

        if (!cancelled) {
          setRecords(list);
        }
      } catch (err) {
        console.error("Failed to load workflow history:", err);

        if (!cancelled) {
          setError(
            err?.message || "Failed to load workflow history"
          );
          setRecords([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRecord = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    return (
      records.find((row) => getRecordId(row) === selectedId) || null
    );
  }, [records, selectedId]);

  const canRerun =
    Boolean(selectedRecord) &&
    typeof props.handleRerun === "function";

  const canRecreate =
    Boolean(selectedRecord) &&
    typeof props.handleForm === "function";

  async function deleteWorkflow() {
    const label = selectedRecord?.name ? `"${selectedRecord.name}" (${selectedId})` : selectedId;
    if (!window.confirm(`Delete workflow ${label} from the Drona database? The working directory is not deleted.`)) {
      return;
    }
    try {
      const response = await fetch(
        `${document.dashboard_url}/jobs/composer/history/${selectedId}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
      setRecords((list) => list.filter((row) => getRecordId(row) !== selectedId));
      updateValue?.(workflowField, "");
      // lets dynamicSelect/dynamicTable lists reload
      window.dispatchEvent(new CustomEvent("drona-refresh-options"));
    } catch (err) {
      setError(err?.message || "Failed to delete workflow");
    }
  }

  const envName = selectedRecord?.runtime || "";
  const envHref = `${window.location.pathname}?environment=${encodeURIComponent(envName)}`;

  return (
    <div className={props.compact ? "" : "mt-3 mb-3"}>
      {error && (
        <div className="alert alert-danger mb-3">
          {error}
        </div>
      )}

      <div
        className="d-flex flex-wrap align-items-center"
        style={{ gap: "0.75rem" }}
      >
        <button
          type="button"
          className="btn btn-primary maroon-button"
          disabled={!canRerun || isLoading}
          onClick={() => props.handleRerun(selectedRecord)}
        >
          Rerun
        </button>

        <button
          type="button"
          className="btn btn-primary maroon-button"
          disabled={!canRecreate || isLoading}
          onClick={() => props.handleForm(selectedRecord)}
        >
          Recreate
        </button>

        {props.showDelete && (
          <button
            type="button"
            className="btn btn-outline-danger"
            style={{ marginLeft: "auto" }}
            disabled={!selectedId || isLoading}
            onClick={deleteWorkflow}
          >
            Delete Workflow
          </button>
        )}
      </div>

      {props.showDisclaimer && selectedRecord && (
        <div className="alert alert-info mt-3 mb-0 text-center" role="note">
          To see the full monitoring panel, open the{" "}
          <a href={envHref}><strong>{envName || "environment"}</strong></a>{" "}
          environment, select <strong>Manage</strong> and pick workflow{" "}
          <strong>{selectedId}</strong>.
          <div className="mt-1"><em>NOTE: Not all environments include a monitoring panel.</em></div>
        </div>
      )}
    </div>
  );
}