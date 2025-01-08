import React, { useState } from "react";
import FieldRenderer from "../FieldRenderer";

function CollapsibleRowContainer({
  elements,
  index,
  onChange,
  startingIndex,
  onSizeChange,
  currentValues,
  setError,
  title = "Collapsible Row Container", // Default title for the collapsible row
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  function toggleCollapse() {
    setIsCollapsed((prev) => !prev);
  }

  return (
	  <div>
	  <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: '2rem' }}>
            <div >
	  <span>{title}</span>
            </div>
                <div>
                  <button className="btn btn-primary maroon-button" onClick={(e) => {
                    e.preventDefault();
		    toggleCollapse();
                  }}>
                {isCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
          </div>

      {/* Content of the row */}
      {!isCollapsed && (
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
      )}
    </div>
  );
}

export default CollapsibleRowContainer;

