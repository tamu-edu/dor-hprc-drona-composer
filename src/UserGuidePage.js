import React from "react";

const DEFAULT_USER_GUIDES_URL =
  "https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_wfe/";

function UserGuidePage() {
  const userGuidesUrl =
    (typeof document !== "undefined" && document.user_guides_url) ||
    DEFAULT_USER_GUIDES_URL;

  return (
    <iframe
      title="Drona Workflow Engine User Guides"
      src={userGuidesUrl}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        border: "none",
        borderRadius: "15px",
        backgroundColor: "#fff",
      }}
    />
  );
}

export default UserGuidePage;
