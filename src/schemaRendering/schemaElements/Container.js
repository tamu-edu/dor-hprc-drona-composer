/**
 * @name Container
 * @description A layout component that organizes form fields in a vertical row.
 * It wraps multiple form elements in a responsive grid layout, with each child
 * element rendered by the FieldRenderer component in a row format.
 *
 * @example
 * // Row with multiple text fields
 * {
 *   "type": "container",
 *   "elements": {
 *     "element1": {
 *       "type": "text",
 *       "name": "element1",
 *       "label": "Container1",
 *       "placeholder": "Enter text"
 *     },
 *     "element2": {
 *       "type": "text",
 *       "name": "element1",
 *       "label": "Container1",
 *       "placeholder": "Enter text"
 *     },
 *     "element3": {
 *       "type": "text",
 *       "name": "element1",
 *       "label": "Container1",
 *       "placeholder": "Enter text"
 *     }
 *   }
 * }
 *
 * @property {string|Object|Array} [layout] - Optional frame: "card" (rounded card with a title pill and green dot) or "boxed", e.g. { "preset": "card", "title": "Job Resources" }; a CSS object applies to the content area. Unset renders no frame.
 * @property {Array} elements - Array of field configuration objects to be rendered in the row
 */

import React, { useMemo } from "react";
import FieldRenderer from "../FieldRenderer";
import LayoutFrame from "../utils/LayoutFrame";
import { resolveLayout } from "../utils/choiceStyles";

const FRAME_PRESETS = ["boxed", "card"];

function Container({
  elements,
  index,
  onChange,
  startingIndex,
  onSizeChange,
  currentValues,
  setError,
  layout,
  locationProps = {}
}) {
  const resolved = useMemo(() => resolveLayout(layout, { only: FRAME_PRESETS }), [layout]);

  return (
    <LayoutFrame resolved={resolved}>
      <div className="form-group">
        <FieldRenderer
          fields={elements}
          handleValueChange={onChange}
          labelOnTop
          startingIndex={startingIndex}
          currentValues={currentValues}
          setError={setError}
          locationProps={locationProps}
        />
      </div>
    </LayoutFrame>
  );
}

export default Container;
