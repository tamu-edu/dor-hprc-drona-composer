function getIconBase() {
  const root = (typeof window !== "undefined" && window.APP_ROOT) || document.dashboard_url || "";
  return `${root}/static/custom/images/env-icons`;
}

const BUNDLED_ICON_FILES = {
  MATLAB: "MATLAB.svg",
  Python: "Python.svg",
  AlphaFold: "AlphaFold.svg",
  LAMMPS: "LAMMPS.svg",
  Parabricks: "Parabricks.svg",
  "R-ACES": "R-ACES.svg",
  Generic: "Generic.svg",
  tamulauncher: "tamulauncher.svg",
  DronaPrimer: "DronaPrimer.svg",
};

export function getEnvironmentIconUrl(envName, rowIconUrl) {
  if (rowIconUrl) {
    return rowIconUrl;
  }
  const file = BUNDLED_ICON_FILES[envName];
  if (!file) {
    return null;
  }
  return `${getIconBase()}/${file}`;
}

export function getEnvironmentInitial(name) {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}
