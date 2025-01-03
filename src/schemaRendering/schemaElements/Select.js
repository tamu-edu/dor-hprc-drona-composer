import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"
import Select from "react-select";

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

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: state.isDisabled ? "#e9ecef" : "#fff",
      borderColor: state.isFocused ? "#80bdff" : "#ced4da",
      borderRadius: ".25rem",
      minHeight: "38px",
      boxShadow: state.isFocused ? "0 0 0 .2rem rgba(0,123,255,.25)" : "none",
      fontSize: "1rem",
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 2,
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#495057",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? "#e9ecef" : "#fff",
      color: "#495057",
      padding: "8px 12px",
      "&:hover": {
        backgroundColor: "#e9ecef",
      },
      ...state.data.styles,
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "4px",
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#6c757d",
    }),
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
