/**
 * Style presets shared by the choice elements (radioGroup, dynamicRadioGroup,
 * checkboxGroup, dynamicCheckboxGroup).
 *
 * Schema props:
 *  - style:  appearance of each option, a string ("default" | "button" | "toggle")
 *  - layout: arrangement/frame of the whole group. A preset name, an object, or an array of those.
 *      "inline" | "list" | "grid" | "boxed" | "card"
 *      { "preset": "boxed", "title": "Running jobs" }   preset with params
 *      { "preset": "card", "title": "Slurm Actions", "dot": true }   rounded card, title pill + live dot
 *      titles may reference form fields: { "preset": "card", "title": "Job $jobs" }   ($fieldName -> current value)
 *      { "maxHeight": "220px", "overflowY": "auto" }     bare CSS (camelCase) for the container
 *
 * The preset tables are plain data (JSON-shaped) so they can be moved out of the bundle later.
 */

export const CHOICE_THEME = {
  maroon: "maroon",
  border: "1px solid #ced4da",
  radius: ".25rem",
  // "card" look, same palette as html_templates/slurm-jobs-template.html
  cardBorder: "#e2e8f0",
  cardRadius: "12px",
  cardMuted: "#64748b",
  cardLive: "#10b981",
};

export const APPEARANCES = {
  default: { kind: "input" },
  button: { kind: "button" },
  // Same look as a checkbox with style "button": check mark / empty box in front of the label
  toggle: { kind: "toggle" },
};

export const LAYOUTS = {
  inline: {},
  list: { stacked: true },
  grid: {
    inner: { display: "grid", gap: "0.25rem 1rem" },
    params: ["minWidth"],
  },
  boxed: {
    box: {
      border: CHOICE_THEME.border,
      borderRadius: CHOICE_THEME.radius,
      padding: "0.5rem 0.75rem",
    },
    params: ["title"],
  },
  // Rounded card with the title as a pill on the top border and an optional live dot.
  // Border/title sit on an outer frame; bare CSS objects apply to the option area inside it.
  card: {
    frame: {
      position: "relative",
      marginTop: "15px",
      background: "#ffffff",
      border: `1px solid ${CHOICE_THEME.cardBorder}`,
      borderRadius: CHOICE_THEME.cardRadius,
      padding: "24px 20px 16px 20px",
      boxSizing: "border-box",
      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
    },
    params: ["title", "dot"],
  },
};

const DEFAULT_GRID_MIN_WIDTH = "12rem";

const EMPTY_LAYOUT = Object.freeze({
  frame: null,
  box: null,
  inner: null,
  stacked: false,
  title: null,
  dot: false,
});

export function resolveAppearance(style) {
  if (style == null || style === "") return APPEARANCES.default;
  if (typeof style === "string" && APPEARANCES[style]) return APPEARANCES[style];
  console.warn(`Unknown choice style "${String(style)}", using "default"`);
  return APPEARANCES.default;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function applyPreset(acc, name, params, warnedParams, only) {
  const preset = LAYOUTS[name];
  if (preset && only && !only.includes(name)) {
    console.warn(`Layout preset "${name}" is not supported here, ignoring`);
    return;
  }
  if (!preset) {
    console.warn(`Unknown choice layout preset "${String(name)}", ignoring`);
    return;
  }
  const allowed = preset.params || [];
  for (const key of Object.keys(params)) {
    if (!allowed.includes(key)) warnedParams.push(`${name}.${key}`);
  }
  if (preset.stacked) acc.stacked = true;
  if (preset.frame) acc.frame = { ...acc.frame, ...preset.frame };
  if (preset.box) acc.box = { ...acc.box, ...preset.box };
  if (preset.inner) acc.inner = { ...acc.inner, ...preset.inner };
  if ((name === "boxed" || name === "card") && typeof params.title === "string") {
    acc.title = params.title;
  }
  if (name === "card") acc.dot = params.dot !== false;
  if (name === "grid") {
    const min = typeof params.minWidth === "string" ? params.minWidth : DEFAULT_GRID_MIN_WIDTH;
    acc.inner = { ...acc.inner, gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))` };
  }
}

/**
 * Resolve the `layout` prop into { box, inner, stacked, title }.
 *  box:   style for the outer frame (border, user CSS), or null
 *  inner: style for the element that holds the options (grid), or null
 * `options.only` restricts the accepted presets (containers only take "boxed" and "card").
 */
export function resolveLayout(layout, options = {}) {
  const only = options.only || null;
  if (layout == null || layout === "") return EMPTY_LAYOUT;

  const items = Array.isArray(layout) ? layout : [layout];
  const acc = { frame: null, box: null, inner: null, stacked: false, title: null, dot: false };
  const warnedParams = [];

  for (const item of items) {
    if (typeof item === "string") {
      applyPreset(acc, item, {}, warnedParams, only);
    } else if (isPlainObject(item) && "preset" in item) {
      const { preset, ...params } = item;
      applyPreset(acc, preset, params, warnedParams, only);
    } else if (isPlainObject(item)) {
      acc.box = { ...acc.box, ...item };
    } else {
      console.warn("Ignoring invalid choice layout item", item);
    }
  }

  if (warnedParams.length) {
    console.warn(`Ignoring unsupported layout params: ${warnedParams.join(", ")}`);
  }
  return acc;
}
