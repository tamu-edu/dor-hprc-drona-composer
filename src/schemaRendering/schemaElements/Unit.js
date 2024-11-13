import React, { useState, useEffect } from "react";
import FormElementWrapper from "./FormElementWrapper";

function Unit(props) {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState(props.units[0].value);
  const [number, setNumber] = useState(0);

  function handleValueChange(event) {
    const { name, value } = event.target;
    if (name === "memory_number") {
      setNumber(value);
    } else if (name === "memory_unit") {
      setUnit(value);
    }
  }

  useEffect(() => {
    const newValue = number == 0 ? "" : `${number}${unit}`;
    setValue(newValue);
    if (props.onChange) props.onChange(props.index, newValue);
  }, [number, unit]);

  const unitList = props.units.map((unit) => (
    <option value={unit.value} key={unit.value}>
      {unit.label}
    </option>
  ));

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >

       <div className="input-group">
          <input
            type="number"
            name="memory_number"
            className="form-control"
            onChange={handleValueChange}
          />
          <div className="input-group-append">
            <select name="memory_unit" onChange={handleValueChange}>
              {unitList}
            </select>
          </div>
        </div>
        <input type="hidden" name={props.name} value={value} />
      </FormElementWrapper>
  );
}

export default Unit;
