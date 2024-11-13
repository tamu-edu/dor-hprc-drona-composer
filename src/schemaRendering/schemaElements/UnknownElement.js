import React from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

function UnknownElement(props) {

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      label={props.label}
    >
        <div className="alert alert-danger">
          Invalid component type: {props.type || "undefined"}
        </div>
    </FormElementWrapper>
  );
}

export default UnknownElement;

