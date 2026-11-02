// Shared look for Drona's dialogs (file picker, Add File, Import Environments):
// maroon accents, 12-13px text, outline/filled header buttons, pill choices,
// a grey breadcrumb-style bar, and a bordered scrolling list of rows.
// Use these instead of copying values into a component's own style object;
// spread and override for a component-specific variant.

export const COLORS = {
  maroon: "#500000",
  rowHover: "#fff0f0",       // hover / selected row
  rowHoverNeutral: "#f8f9fa", // hover on rows that are not "the" selection
  barBg: "#f8f9fa",
  border: "#dee2e6",
  rowDivider: "#f0f0f0",
  inputBorder: "#ced4da",
  text: "#212529",
  textSecondary: "#495057",
  muted: "#6c757d",          // ~4.7:1 on white
  faint: "#adb5bd",          // separators, chevrons
  disabled: "#ccc",
  danger: "#dc3545",
  folder: "#8a6300",         // darkened amber, ~4.5:1 on white
};

// Header buttons: secondary (white, maroon outline) and primary (maroon fill)
export const cancelBtn = {
  padding: "5px 14px", fontSize: "12px", fontWeight: "500",
  backgroundColor: "white", color: COLORS.maroon,
  border: `1px solid ${COLORS.maroon}`, borderRadius: "4px", cursor: "pointer",
};

export const primaryBtn = (disabled) => ({
  padding: "5px 14px", fontSize: "12px", fontWeight: "500",
  backgroundColor: disabled ? COLORS.disabled : COLORS.maroon,
  border: `1px solid ${disabled ? COLORS.disabled : COLORS.maroon}`,
  borderRadius: "4px", color: "white",
  cursor: disabled ? "default" : "pointer",
});

export const headerBtnRow = { display: "flex", gap: "8px" };

// Rounded choice buttons (quick-access locations, filters); active = filled
export const pillRow = { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" };

export const pillBtn = (active = false) => ({
  padding: "4px 12px", fontSize: "12px", fontWeight: "500",
  backgroundColor: active ? COLORS.maroon : "white",
  color: active ? "white" : COLORS.maroon,
  border: `1px solid ${COLORS.maroon}`, borderRadius: "14px", cursor: "pointer",
});

// Grey bar (breadcrumb, group header, selected-item summary)
export const bar = {
  display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2px",
  padding: "6px 10px", backgroundColor: COLORS.barBg,
  border: `1px solid ${COLORS.border}`, borderRadius: "4px", marginBottom: "10px",
  fontSize: "13px", minHeight: "32px",
};

export const crumbBtn = (isLast) => ({
  background: "none", border: "none", padding: "2px 4px",
  fontSize: "13px", cursor: isLast ? "default" : "pointer",
  color: isLast ? COLORS.textSecondary : COLORS.maroon,
  fontWeight: isLast ? "600" : "400",
  borderRadius: "3px",
});

// Bordered scrolling list and its rows
export const list = {
  border: `1px solid ${COLORS.border}`, borderRadius: "4px",
  overflowY: "auto", maxHeight: "320px", minHeight: "120px",
  backgroundColor: "white",
};

export const row = (selected = false) => ({
  display: "flex", alignItems: "center", gap: "10px",
  padding: "6px 12px", fontSize: "13px", cursor: "pointer",
  backgroundColor: selected ? COLORS.rowHover : "transparent",
  borderBottom: `1px solid ${COLORS.rowDivider}`,
});

export const rowChevron = { fontSize: "11px", color: COLORS.faint, flexShrink: 0 };

export const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// Centered grey text inside a list (loading, empty, "select something")
export const emptyState = { padding: "24px 16px", textAlign: "center", fontSize: "13px", color: COLORS.muted };

export const loadingRow = {
  display: "flex", alignItems: "center", gap: "8px",
  padding: "4px 0 12px", fontSize: "13px", color: COLORS.maroon,
};

export const spinner = { color: COLORS.maroon };

// Summary bar under a list (selected path, etc.)
export const selectedBar = {
  marginTop: "10px", padding: "8px 12px",
  backgroundColor: COLORS.barBg, border: `1px solid ${COLORS.border}`,
  borderRadius: "4px", display: "flex", alignItems: "center", gap: "8px",
};

export const monoText = {
  fontSize: "13px", color: COLORS.textSecondary, flex: 1,
  ...ellipsis,
  fontFamily: "monospace",
};

export const hint = { fontSize: "12px", color: COLORS.muted };

// Use with className="alert alert-<kind> py-1 px-2" for compact inline notices
export const inlineAlert = { fontSize: "13px" };

export const textInput = {
  width: "100%", padding: "6px 10px", fontSize: "13px",
  border: `1px solid ${COLORS.inputBorder}`, borderRadius: "4px",
  outline: "none", boxSizing: "border-box",
};
