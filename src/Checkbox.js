import React, { useState } from "react";
import Label from "./Label"

function Checkbox(props) {
  const [isChecked, setIsChecked] = useState(false);

  function handleValueChange(event) {
    const value = event.target.checked ? props.value : "";
    setIsChecked(event.target.checked);
    if (props.onChange) props.onChange(props.index, value);
  }

  return (
    <div className="form-group row">
      <Label name={props.name} label={props.label}/>
      <div className="col-lg-9">
        <input
          type="checkbox"
          name={props.name}
          id={props.id}
          value={props.value}
          checked={isChecked}
          className="form-control move-left"
          onChange={handleValueChange}
        />
      </div>
    </div>
  );
}
export default Checkbox;
