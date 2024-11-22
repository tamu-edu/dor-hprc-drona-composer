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
