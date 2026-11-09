import React from "react";

const DEFAULT_ICON = "/static/env-icons/generic_puzzle.png";

// Icon URLs from the environment list are app-relative; prefix the OOD app root when needed.
export function getIconUrl(icon = DEFAULT_ICON) {
  const appRoot = document.dashboard_url || "";
  if (appRoot && icon.startsWith("/") && !icon.startsWith(appRoot)) {
    return `${appRoot}${icon}`;
  }
  return icon;
}

// An environment's icon, falling back to the default puzzle icon if it fails to load.
export default function EnvIcon({ env, className }) {
  return (
    <img
      className={className}
      src={getIconUrl(env && env.icon ? env.icon : undefined)}
      alt=""
      onError={(event) => {
        if (event.currentTarget.dataset.fallbackApplied === "true") return;
        event.currentTarget.dataset.fallbackApplied = "true";
        event.currentTarget.src = getIconUrl();
      }}
    />
  );
}
