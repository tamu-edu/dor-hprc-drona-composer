import React, { useState } from "react";
import FormElementWrapper from "./FormElementWrapper"

function Number(props) {
  const [value, setValue] = useState(props.value || "");

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
  }

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
        <input
          type="number"
          name={props.name}
          id={props.id}
          value={value}
          placeholder={props.placeholder}
          className="form-control"
          min={props.min}
          max={props.max}
          step={props.step}
          onChange={handleValueChange}
        />
    </FormElementWrapper>
  );
}
export default Number;
