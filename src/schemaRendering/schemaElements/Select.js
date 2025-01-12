import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"
import Select from "react-select";
import { customSelectStyles } from "../utils/selectStyles"

function CustomSelect(props) {
  const [value, setValue] = useState(props.value || "");

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  const handleValueChange = (option) => {
    setValue(option);
    if (props.onChange) {
      props.onChange(props.index, option);
    }
  };

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div style={{display: "flex"}}>
        <Select
          menuPortalTarget={document.body}
          menuPosition="fixed"
          value={value}
          onChange={handleValueChange}
          options={props.options}
          name={props.name}
          styles={{
            ...customSelectStyles,
	    container: (base) => ({ ...base, flexGrow: 1 }),
          }}
          placeholder="-- Choose an option --"
        />
        <input
          type="hidden"
          name={`${props.name}_label`}
          value={value?.label || ""}
        />
        {props.showAddMore && (
          <button
            type="button"
            className="btn btn-primary maroon-button"
            style={{ marginLeft: "2px" }}
            onClick={props.onAddMore}
          >
            +
          </button>
        )}
      </div>
    </FormElementWrapper>
  );
}

export default CustomSelect;
