/**
 * Renders the frame described by a resolved `layout` (see choiceStyles.js resolveLayout):
 * the "card" frame with a title pill and live dot, the plain "boxed" frame, or nothing.
 * With an empty layout it renders `children` untouched, so elements look the same as before.
 */
import React, { useContext } from "react";
import { CHOICE_THEME } from "./choiceStyles";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "./fieldUtils";

// "Job $jobs" -> "Job 123": `$fieldName` references in a title are replaced by the current form value
// (empty when unset). Same `$` convention as retrieverParams.
const FIELD_REF = /\$([A-Za-z_][\w.]*)/g;

// Card "summary": like substituteFieldRefs, but the text is split into " · " parts and a part whose
// field references are all empty is left out (e.g. a walltime left at the cluster default, an
// unchecked checkbox). Returns "" when nothing is left.
export function summarizeFieldRefs(text, formValues) {
  if (!text) return "";
  return text
    .split(" · ")
    .filter((part) => {
      const refs = part.match(FIELD_REF);
      return !refs || refs.some((ref) => substituteFieldRefs(ref, formValues).trim() !== "");
    })
    .map((part) => substituteFieldRefs(part, formValues).trim())
    .join(" · ");
}

export function substituteFieldRefs(text, formValues) {
  if (!text || !text.includes("$")) return text;
  return text.replace(FIELD_REF, (_, name) => {
    let value = getFieldValue(formValues || [], name);
    // Select fields hold an option object once changed; print its value, as conditions compare it
    if (value && typeof value === "object" && !Array.isArray(value)) value = value.value;
    return value == null ? "" : String(value);
  });
}

const CARD_TITLE_STYLE = {
  position: "absolute",
  top: "-12px",
  left: "20px",
  background: "#ffffff",
  padding: "2px 16px",
  fontSize: "var(--drona-text-caption)",
  fontWeight: "var(--drona-weight-strong)",
  color: CHOICE_THEME.cardMuted,
  textTransform: "uppercase",
  letterSpacing: "2px",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  border: `1px solid ${CHOICE_THEME.cardBorder}`,
  borderRadius: "999px",
};

// Right-corner counterpart of the title pill: sits on the top border so it never covers the content
const ACTION_SLOT_STYLE = { position: "absolute", top: "-12px", right: "20px", display: "flex", gap: "6px" };

// Optional badge pill (filled maroon) and then the title pill sit side by side on the top border.
const BADGE_ROW_STYLE = {
  position: "absolute",
  top: "-12px",
  left: "20px",
  display: "flex",
  gap: "6px",
};
const TITLE_IN_ROW = { position: "static" };
const BADGE_STYLE = { color: "#ffffff", background: "#500000", borderColor: "#500000" };

// Flat "bar" layout: one line, badge pill + bold title + content
const BAR_ROW_STYLE = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.25rem 0.6rem", marginBottom: "1rem" };
const BAR_TITLE_STYLE = { fontSize: "var(--drona-text-ui)", fontWeight: "var(--drona-weight-strong)", color: "#1e293b", whiteSpace: "nowrap" };
const BAR_BADGE_STYLE = {
  fontSize: "var(--drona-text-caption)",
  fontWeight: "var(--drona-weight-strong)",
  lineHeight: "16px",
  padding: "0 8px",
  color: "#500000",
  background: "#faf3f3",
  border: "1px solid #ead7d7",
  borderRadius: "999px",
  whiteSpace: "nowrap",
};
const BAR_CSS = ".choice-bar .form-group { margin-bottom: 0; } .choice-bar .mb-1 { margin-bottom: 0 !important; }";

const ACCENT_TITLE_STYLE = {
  borderColor: "#500000",
  color: "#ffffff",
  background: "#500000",
};

// Accent cards are compact: form groups inside get a smaller bottom margin than the default 1rem.
const COMPACT_CSS = ".choice-card-compact .form-group { margin-bottom: 0.25rem; } .choice-card-compact .btn-group-toggle, .choice-card-compact .mb-1 { margin-bottom: 0 !important; }";
const ACCENT_CSS = ".choice-card-accent .form-group { margin-bottom: 0.75rem; }";

const LIVE_DOT_STYLE = {
  width: "6px",
  height: "6px",
  background: CHOICE_THEME.cardLive,
  borderRadius: "50%",
  boxShadow: `0 0 6px ${CHOICE_THEME.cardLive}`,
  animation: "choice-live-pulse 2s infinite",
};

const LIVE_DOT_KEYFRAMES =
  "@keyframes choice-live-pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }";

// Same maroon as the other Drona buttons
const ACCENT = "#500000";

const TOGGLE_TITLE_STYLE = {
  ...CARD_TITLE_STYLE,
  cursor: "pointer",
  fontFamily: "inherit",
  lineHeight: "inherit",
};

const CHEVRON_STYLE = { fontSize: "var(--drona-text-ui)", lineHeight: 1, color: ACCENT };

const COLLAPSED_FRAME_PADDING = "14px 20px";

// Folded strip with a "summary": the current settings in plain muted text, left-aligned under the title
const COLLAPSED_SUMMARY_STYLE = {
  fontSize: "var(--drona-text-caption)",
  color: CHOICE_THEME.cardMuted,
  lineHeight: "16px",
  paddingTop: "2px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const COLLAPSED_HINT_STYLE = {
  textAlign: "right",
  fontSize: "var(--drona-text-caption)",
  fontStyle: "italic",
  color: CHOICE_THEME.cardMuted,
  lineHeight: "16px",
};

// Hover/focus states cannot be written as inline styles, so they live in a scoped stylesheet.
const TOGGLE_CSS = `
.choice-card-toggle { transition: border-color .15s, background-color .15s, color .15s; }
.choice-card-toggle:hover,
.choice-card-collapsed:hover .choice-card-toggle { border-color: ${ACCENT}; background-color: #f8f2f2; color: ${ACCENT}; }
.choice-card-toggle:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
.choice-card-collapsed { transition: border-color .15s; }
.choice-card-collapsed:hover { border-color: ${ACCENT}; }
`;

/**
 * @param {Object} resolved - result of resolveLayout
 * @param {string} [title] - fallback title when the layout has none
 * @param {Function} [actionRef] - card only: callback ref for a slot on the top border at the right corner,
 *   mirroring the title pill; the owner portals a small action (e.g. a refresh button) into it
 * @param {{isCollapsed: boolean, onToggle: Function}} [collapse] - card only: the title pill becomes
 *   the toggle (chevron instead of the live dot) and the content is hidden (kept mounted) when collapsed
 */
function LayoutFrame({ resolved, title: titleProp, collapse, actionRef, children }) {
  const { values: formValues } = useContext(FormValuesContext);
  const title = substituteFieldRefs(resolved.title || titleProp, formValues)?.trim();
  const badge = substituteFieldRefs(resolved.badge, formValues)?.trim();
  const summary = summarizeFieldRefs(resolved.summary, formValues);

  if (resolved.bar) {
    return (
      <div style={{ ...BAR_ROW_STYLE, ...resolved.box }} className="choice-bar">
        <style>{BAR_CSS}</style>
        {badge && <span style={BAR_BADGE_STYLE}>{badge}</span>}
        {title && <span style={BAR_TITLE_STYLE}>{title}</span>}
        <div style={{ flex: "1 1 auto" }}>{children}</div>
      </div>
    );
  }

  if (resolved.frame) {
    const collapsed = !!collapse?.isCollapsed;
    const frameStyle = collapsed
      ? { ...resolved.frame, padding: COLLAPSED_FRAME_PADDING, cursor: "pointer" }
      : resolved.frame;
    const contentStyle = collapsed ? { ...resolved.box, display: "none" } : resolved.box || undefined;

    // The collapsed strip expands on click anywhere; the pill button handles its own clicks.
    const onFrameClick = (e) => {
      if (collapsed && !e.target.closest("button")) collapse.onToggle(e);
    };

    return (
      <div
        style={frameStyle}
        className={
          [collapsed && "choice-card-collapsed", resolved.accent && "choice-card-accent", resolved.compact && "choice-card-compact"]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onClick={collapse ? onFrameClick : undefined}
      >
        {resolved.accent && <style>{ACCENT_CSS}</style>}
        {resolved.compact && <style>{COMPACT_CSS}</style>}
        {title && collapse ? (
          <>
            <style>{TOGGLE_CSS}</style>
            <button
              type="button"
              className="choice-card-toggle"
              style={TOGGLE_TITLE_STYLE}
              onClick={collapse.onToggle}
              aria-expanded={!collapsed}
            >
              <span style={CHEVRON_STYLE} aria-hidden="true">
                {collapsed ? "\u25B8" : "\u25BE"}
              </span>
              {title}
            </button>
          </>
        ) : (
          title && (
            <div style={BADGE_ROW_STYLE}>
              {badge && <div style={{ ...CARD_TITLE_STYLE, ...TITLE_IN_ROW, ...BADGE_STYLE }}>{badge}</div>}
              <div
                style={{
                  ...(resolved.accent ? { ...CARD_TITLE_STYLE, ...ACCENT_TITLE_STYLE } : CARD_TITLE_STYLE),
                  ...TITLE_IN_ROW,
                }}
              >
                {resolved.dot && (
                  <>
                    <style>{LIVE_DOT_KEYFRAMES}</style>
                    <div style={LIVE_DOT_STYLE} />
                  </>
                )}
                {title}
              </div>
            </div>
          )
        )}
        {actionRef && <div ref={actionRef} style={ACTION_SLOT_STYLE} />}
        {collapsed && (
          summary ? (
            <div style={COLLAPSED_SUMMARY_STYLE}>{summary}</div>
          ) : (
            <div style={COLLAPSED_HINT_STYLE} aria-hidden="true">
              Click to expand
            </div>
          )
        )}
        <div style={contentStyle}>{children}</div>
      </div>
    );
  }

  if (!resolved.box && !title) return <>{children}</>;

  return (
    <div style={resolved.box || undefined}>
      {title && (
        <div style={{ fontWeight: "var(--drona-weight-strong)", marginBottom: "0.25rem" }}>{title}</div>
      )}
      {children}
    </div>
  );
}

export default LayoutFrame;
