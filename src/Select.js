import React, { useState } from "react";

function Select(props) {
  const [value, setValue] = useState("");

  const optionList = props.options.map((option) => (
    <option key={option.value} value={option.value} {...option}>
      {option.label}
    </option>
  ));

  function handleValueChange(event) {
    const select = event.target
    setValue(select.value);
    if (props.onChange) props.onChange(props.index, select.options[select.selectedIndex]);
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
        <select
          name={props.name}
          defaultValue="-- Choose an option --"
          className="form-control"
          onChange={handleValueChange}
        >
          <option disabled key="default">
            -- Choose an option --
          </option>
          {optionList}
        </select>
      </div>
    </div>
  );
}

export default Select;
