import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"

function RadioGroup(props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (props.value != "") {
      setValue(props.value);
    }
  }, [props.value]);

  function handleValueChange(event) {
    const newValue = event.target.value;
    setValue(newValue);
    if (props.onChange) props.onChange(props.index, newValue);
  }

  const optionList = props.options.map((option) => (
    <div className="form-check form-check-inline" key={option.value}>
      <input
        type="radio"
        className="form-check-input"
        value={option.value}
        name={props.name}
        checked={value === option.value}
        onChange={handleValueChange}
      />
      <label className="form-check-label" htmlFor={`${props.name}-${option.value}`}>
        {option.label}
      </label>
    </div>
  ));

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      {optionList}
    </FormElementWrapper>
  );
}

export default RadioGroup;
