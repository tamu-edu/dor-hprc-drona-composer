import React from "react";
import FormElementWrapper from "./FormElementWrapper";

function Unknown(props) {
  const [value, setValue] = useState(props.value || "");

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
    if (props.onNameChange) props.onNameChange(event.target.value);
  }

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      label={props.label}
    >
	             <div key={elementIndex} className="col">
              {/* Fallback UI for invalid element types */}
              <div className="alert alert-danger">
                Invalid component type: {type || "undefined"}
              </div>
            </div>
    </FormElementWrapper>
  );
}

export default Text;

