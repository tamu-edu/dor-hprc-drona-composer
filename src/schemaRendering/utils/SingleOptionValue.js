import React from "react";

const boxStyle = {
  display: "flex",
  alignItems: "center",
  height: "auto",
  minHeight: "38px",
  backgroundColor: "#e9ecef",
  color: "#495057",
};

/**
 * Stands in for a dynamic choice element that has only one option (`hideWhenSingle`): shows the
 * option's label in a read-only box and keeps the value in a hidden input so it is still submitted.
 */
function SingleOptionValue({ name, option, withLabelInput = false }) {
  return (
    <>
      <div className="form-control" style={boxStyle} title="Only one option available">
        <span style={{ flexGrow: 1 }}>{option.label}</span>
        <small className="text-muted" style={{ marginLeft: "0.5rem", whiteSpace: "nowrap" }}>
          only option
        </small>
      </div>
      <input type="hidden" name={name} value={option.value} />
      {withLabelInput && <input type="hidden" name={`${name}_label`} value={option.label} />}
    </>
  );
}

export default SingleOptionValue;
