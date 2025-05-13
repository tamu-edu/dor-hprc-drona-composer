/**
 * @component Unit
 * @description A compound input component that combines a numeric value with a unit selector.
 * Useful for inputs like memory size (GB, MB), time duration (hours, minutes), or any
 * quantity that requires both a number and unit.
 *
 * @example
 * // Memory size input with unit selection
 * {
 *   "type": "unit",
 *   "name": "memorySize",
 *   "label": "Unit",
 *   "value": "16GB",
 *   "units": [
 *     { "value": "MB", "label": "MB" },
 *     { "value": "GB", "label": "GB" },
 *     { "value": "TB", "label": "TB" }
 *   ],
 *   "help": "Select a numeric value with units"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} [value] - Default/initial value in format "numberunit" (e.g., "16GB")
 * @property {Array} units - Array of unit options, each with value and label properties
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

function Unit(props) {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState(props.units[0].value);
  const [number, setNumber] = useState(0);
  const [unitLabel, setUnitLabel] = useState(props.units[0].label);

  useEffect(() => {
    if (props.value && props.value !== "") {
      const match = props.value.match(/^(\d+)(.+)$/);
      if (match) {
        const [_, num, unitValue] = match;
        setNumber(Number(num));
        setUnit(unitValue);
        const unitObj = props.units.find(u => u.value === unitValue);
        if (unitObj) {
          setUnitLabel(unitObj.label);
        }
      }
    }
  }, [props.value, props.units]);

  function handleValueChange(event) {
    const { name, value } = event.target;
    if (name === "memory_number") {
      setNumber(value);
    } else if (name === "memory_unit") {
      setUnit(value);
      const unitObj = props.units.find(u => u.value === value);
      if (unitObj) {
        setUnitLabel(unitObj.label);
      }
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
          value={number || ""}
          onChange={handleValueChange}
        />
        <div className="input-group-append">
          <select 
            name="memory_unit" 
            value={unit}
            onChange={handleValueChange}
          >
            {unitList}
          </select>
        </div>
      </div>
      <input type="hidden" name={props.name} value={value} />
    </FormElementWrapper>
  );
}

export default Unit;
