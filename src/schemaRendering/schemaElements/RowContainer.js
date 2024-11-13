import React from "react";
import FieldRenderer from "../FieldRenderer";

function RowContainer({
  elements,
  index,
  onChange,
  startingIndex,
  onSizeChange,
  currentValues 
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
      />
    </div>
  );
}

export default RowContainer;
