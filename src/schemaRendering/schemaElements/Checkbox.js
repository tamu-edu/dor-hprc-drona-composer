import React, { useState } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"

function Checkbox(props) {
  const [isChecked, setIsChecked] = useState(false);

  function handleValueChange(event) {
    const value = event.target.checked ? props.value : "";
    setIsChecked(event.target.checked);
    if (props.onChange) props.onChange(props.index, value);
  }

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
        <input
          type="checkbox"
          name={props.name}
          id={props.id}
          value={props.value}
          checked={isChecked}
          className="form-control move-left"
          onChange={handleValueChange}
        />
    </FormElementWrapper>
  );
}
export default Checkbox;
