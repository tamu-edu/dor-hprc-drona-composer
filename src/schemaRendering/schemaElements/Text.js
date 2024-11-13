import React, { useState } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

function Text(props) {
  const [value, setValue] = useState(props.value || "");

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
    if (props.onNameChange) props.onNameChange(event.target.value);
  }

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <input
        type="text"
        name={props.name}
        id={props.id}
        value={value}
        placeholder={props.placeholder}
        className="form-control"
        onChange={handleValueChange}
      />
    </FormElementWrapper>
  );
}

export default Text;

