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
 * @property {Array} elements - Array of field configuration objects to be rendered in the row
 */

import React from "react";
import FieldRenderer from "../FieldRenderer";

function Container({
  elements,
  layout,
  index,
  onChange,
  startingIndex,
  onSizeChange,
  currentValues,
  setError,
  locationProps = {}
}) {
  const isRow = layout === "row";

  return (
    <div className={isRow ? "form-group row" : "form-group"}>
      <FieldRenderer
        fields={elements}
        handleValueChange={onChange}
        labelOnTop
        fieldStyles={isRow ? "col" : undefined}
        startingIndex={startingIndex}
        currentValues={currentValues}
        setError={setError}
        locationProps={locationProps}
      />
    </div>
  );
}

export default Container;
