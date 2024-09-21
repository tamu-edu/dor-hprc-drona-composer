import React, { useState } from "react";
import Label from "./Label"

function RadioGroup(props) {
  const [value, setValue] = useState("");

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
  }

  const optionList = props.options.map((option) => (
    <div className="form-check form-check-inline" key={option.value}>
      <input
        type="radio"
        className="form-check-input"
        value={option.value}
        name={props.name}
        onChange={handleValueChange}
      />
      <label className="form-check-label" htmlFor={props.name}>
        {option.label}
      </label>
    </div>
  ));

  return (
    <div className="form-group row">
      <Label name={props.name} label={props.label} help={props.help}/>
      <div className="col-lg-9">{optionList}</div>
    </div>
  );
}

export default RadioGroup;
