import React from "react";

const DEFAULT_USER_GUIDES_URL =
  "https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_wfe/";

function DocumentsPage() {
  const userGuidesUrl =
    (typeof document !== "undefined" && document.user_guides_url) ||
    DEFAULT_USER_GUIDES_URL;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h5 className="mb-3" style={{ fontWeight: "600" }}>
        User Guides
      </h5>
      <iframe
        title="Drona Workflow Engine User Guides"
        src={userGuidesUrl}
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
