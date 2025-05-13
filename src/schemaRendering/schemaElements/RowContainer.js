/**
 * @component RowContainer
 * @description A layout component that organizes form fields in a horizontal row.
 * It wraps multiple form elements in a responsive grid layout, with each child
 * element rendered by the FieldRenderer component in a column format.
 *
 * @example
 * // Row with multiple text fields
 * {
 *   "type": "rowContainer",
 *   "elements": {
 *     "element1": {
 *       "type": "text",
 *       "name": "element1",
 *       "label": "rowContainer1",
 *       "placeholder": "Enter text"
 *     },
 *     "element2": {
 *       "type": "text",
 *       "name": "element1",
 *       "label": "rowContainer1",
 *       "placeholder": "Enter text"
 *     },
 *     "element3": {
 *       "type": "text",
 *       "name": "element1",
 *       "label": "rowContainer1",
 *       "placeholder": "Enter text"
 *     }
 *   }
 * }
 *
 * @property {Array} elements - Array of field configuration objects to be rendered in the row
 */

import React from "react";
import FieldRenderer from "../FieldRenderer";

function RowContainer({
  elements,
  index,
  onChange,
  startingIndex,
  onSizeChange,
  currentValues,
  setError
}) {

  return (
    <div className="form-group row">
      <FieldRenderer
        fields={elements}
        handleValueChange={onChange}
        labelOnTop
        fieldStyles="col"
        startingIndex={startingIndex}
	currentValues={currentValues}
     	setError={setError}
      />
    </div>
  );
}

export default RowContainer;
