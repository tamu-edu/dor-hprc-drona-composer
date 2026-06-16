import React from "react";

const DEFAULT_DOCS_URL =
  "https://tamu-edu.github.io/dor-hprc-drona-composer/docs/overview/intro";

function DocumentsPage() {
  const docsUrl =
    (typeof document !== "undefined" && document.docs_url) || DEFAULT_DOCS_URL;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h5 className="mb-3" style={{ fontWeight: "600" }}>
        Documentation
      </h5>
      <iframe
        title="Drona Workflow Engine Documentation"
        src={docsUrl}
        style={{
          flex: 1,
          width: "100%",
          minHeight: 0,
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          backgroundColor: "#fff",
        }}
      />
    </div>
  );
}

export default DocumentsPage;
