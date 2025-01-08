import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"

function Checkbox(props) {
  const [isChecked, setIsChecked] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
     if(props.value != "") {
     	setValue(props.value);
     }
     setIsChecked(props.value != "");
  }, [props.value]);

  function handleValueChange(event) {
    const new_value = event.target.checked ? value : "";
    setIsChecked(event.target.checked);
    if (props.onChange) props.onChange(props.index, new_value);
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
          value={value}
          checked={isChecked}
          className="form-control move-left"
          onChange={handleValueChange}
        />
    </FormElementWrapper>
  );
}

export default Checkbox;
