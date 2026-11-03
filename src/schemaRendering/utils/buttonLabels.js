import { Containers } from "../schemaElements/index";

// Labels used when no visible buttonLabels element sets them: "preview" is the form button that
// generates the scripts, "submit" runs them (job or action), "title" heads the window showing them.
export const DEFAULT_BUTTON_LABELS = { preview: "Generate", submit: "Run", title: "Generated Scripts" };

/**
 * Pick the button labels from the visible buttonLabels elements in a normalized field list.
 * The most deeply nested visible element wins (a label set inside a mode's container overrides
 * one at the top of the schema); at equal depth the later one wins. Keys an element leaves out
 * fall back to the defaults.
 */
export function resolveButtonLabels(fields) {
  let best = null;
  let bestDepth = -1;

  const walk = (list, depth) => {
    for (const field of list || []) {
      if (!field || !field.isVisible) continue;
      if (field.type === "buttonLabels" && depth >= bestDepth) {
        best = field;
        bestDepth = depth;
      }
      if (Containers.includes(field.type) && field.elements) {
        walk(field.elements, depth + 1);
      }
    }
  };
  walk(fields, 0);

  const pick = (key) =>
    best && typeof best[key] === "string" && best[key].trim() !== ""
      ? best[key]
      : DEFAULT_BUTTON_LABELS[key];

  return { preview: pick("preview"), submit: pick("submit"), title: pick("title") };
}
