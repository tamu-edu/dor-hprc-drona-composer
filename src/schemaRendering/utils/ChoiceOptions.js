/**
 * Shared renderer for the options of radio/checkbox groups.
 * See choiceStyles.js for the `style` and `layout` values.
 *
 * With no `style`/`layout` the markup is the same as the original per-element rendering.
 */
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { CHOICE_THEME, resolveAppearance, resolveLayout } from "./choiceStyles";
import LayoutFrame from "./LayoutFrame";

const HIDDEN_INPUT_STYLE = {
  position: "absolute",
  opacity: 0,
  width: 0,
  height: 0,
  pointerEvents: "none",
};

const ChoiceOption = React.memo(function ChoiceOption({
  type,
  name,
  option,
  checked,
  onChange,
  kind,
  stacked,
  accent,
}) {
  const id = `${name}-${option.value}`;
  const label = option.label ?? String(option.value);

  if (kind === "button") {
    return (
      <div
        className={stacked ? "d-block mb-1" : "d-inline-block mb-1"}
        style={stacked ? undefined : { marginRight: "0.5rem" }}
      >
        <input
          id={id}
          type={type}
          className="btn-check"
          value={option.value}
          name={name}
          checked={checked}
          onChange={onChange}
          autoComplete="off"
          style={HIDDEN_INPUT_STYLE}
        />
        <label
          className={`btn ${checked ? "maroon-button-filled" : "maroon-button"}`}
          htmlFor={id}
        >
          {label}
        </label>
      </div>
    );
  }

  if (kind === "toggle") {
    return (
      <div
        className={stacked ? "d-block mb-1" : "d-inline-block mb-1"}
        style={stacked ? undefined : { marginRight: "0.5rem" }}
      >
        <input
          id={id}
          type={type}
          className="btn-check"
          value={option.value}
          name={name}
          checked={checked}
          onChange={onChange}
          autoComplete="off"
          style={HIDDEN_INPUT_STYLE}
        />
        <label
          className="btn"
          htmlFor={id}
          style={{
            marginBottom: 0,
            cursor: "pointer",
            border: "2px solid #500000",
            color: checked ? "#ffffff" : "#500000",
            backgroundColor: checked ? "#500000" : "#ffffff",
            fontWeight: checked ? 600 : 400,
            transition: "background-color .15s, color .15s",
          }}
        >
          {checked ? "\u2713 " : "\u2610 "}{label}
        </label>
      </div>
    );
  }

  return (
    <div className={stacked ? "form-check" : "form-check form-check-inline"}>
      <input
        id={id}
        type={type}
        className="form-check-input"
        value={option.value}
        name={name}
        checked={checked}
        onChange={onChange}
        style={accent ? { accentColor: CHOICE_THEME.maroon } : undefined}
      />
      <label
        className="form-check-label"
        htmlFor={id}
        style={accent ? { color: checked ? CHOICE_THEME.maroon : "inherit" } : undefined}
      >
        {label}
      </label>
    </div>
  );
});

/**
 * @param {"radio"|"checkbox"} type
 * @param {Array} options
 * @param {*} selected - a value (radio) or an array of values (checkbox)
 * @param {Function} onChange - native change event handler
 * @param {string} [style] - appearance preset
 * @param {string|Object|Array} [layout] - layout presets / CSS
 * @param {boolean} [accent] - maroon accent on the default appearance
 */
function ChoiceOptions({ type, name, options, selected, onChange, style, layout, accent = false }) {
  const appearance = useMemo(() => resolveAppearance(style), [style]);
  const resolved = useMemo(() => resolveLayout(layout), [layout]);

  // Keep the handler identity stable so memoized options don't re-render on every change.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const stableOnChange = useCallback((e) => onChangeRef.current?.(e), []);

  const isChecked = (value) =>
    Array.isArray(selected) ? selected.includes(value) : selected === value;

  const items = (options || []).map((option) => {
    if (!option || typeof option.value === "undefined") return null;
    return (
      <ChoiceOption
        key={option.value}
        type={type}
        name={name}
        option={option}
        checked={isChecked(option.value)}
        onChange={stableOnChange}
        kind={appearance.kind}
        stacked={resolved.stacked}
        accent={accent}
      />
    );
  });

  const body = resolved.inner ? <div style={resolved.inner}>{items}</div> : items;

  return <LayoutFrame resolved={resolved}>{body}</LayoutFrame>;
}

export default ChoiceOptions;
