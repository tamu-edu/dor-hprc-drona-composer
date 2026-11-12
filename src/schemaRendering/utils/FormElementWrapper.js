import React from "react";
import Label from "./Label";

const FormElementWrapper = ({ labelOnTop, name, label, help, children, useLabel = true, compact = false }) => {
  return (
    <div className="form-group" style={compact ? { marginBottom: "0.25rem" } : undefined}>

      {useLabel ?
        labelOnTop ? (
          // Label on top of the input field
          <>
            <Label labelOnTop name={name} label={label} help={help} />
            <div>{children}</div>
          </>
        ) : (
          // Label beside the input field (default)
          <div className="row">
            <Label name={name} label={label} help={help} />
            <div className="col-lg-9">{children}</div>
          </div>
        ) : (
          <div>{children}</div>
        )}
    </div>
  );
};

export default FormElementWrapper;

