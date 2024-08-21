import React, { useState } from "react";
import Label from "./Label"

function Number(props) {
  const [value, setValue] = useState(props.value || "");

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
  }

  return (
    <div className="form-group row">
     <Label name={props.name} label={props.label}/>
      <div className="col-lg-9">
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
      </div>
    </div>
  );
}
export default Number;
