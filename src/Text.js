import React, { useState } from "react";

function Text(props) {
  const [value, setValue] = useState(props.value || "");

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
    if (props.onNameChange) props.onNameChange(event.target.value);
  }

  return (
    <div className="form-group row">
      <label
        className="col-lg-3 col-form-label form-control-label"
        htmlFor={props.name}
      >
        {props.label}
      </label>
      <div className="col-lg-9">
        <input
          type="text"
          name={props.name}
          id={props.id}
          value={value}
          placeholder={props.placeholder}
          className="form-control"
          onChange={handleValueChange}
        />
      </div>
    </div>
  );
}
export default Text;
