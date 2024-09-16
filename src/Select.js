import React, { useState } from "react";
import Label from "./Label";
import Select from "react-select";

function CustomSelect(props) {
  const [value, setValue] = useState("");

  // const optionList = props.options.map((option) => (
  //   <option key={option.value} value={option.value} {...option}>
  //     {option.label}
  //   </option>
  // ));

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
      fontSize: "1rem", // Matches font size of Bootstrap form-control
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 2, // Ensure the menu appears above other elements
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#495057", // Matches Bootstrap's text color
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? "#e9ecef" : "#fff", // Match hover style
      color: "#495057",
      padding: "8px 12px", // Match default padding for options
      "&:hover": {
        backgroundColor: "#e9ecef", // Matches hover effect
      },

      ...state.data.styles,
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "4px", // Adjust padding for dropdown arrow
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#6c757d", // Matches Bootstrap placeholder color
    }),
  };
  return (
    <div className="form-group row">
      <Label name={props.name} label={props.label} help={props.help} />
      <div className="col-lg-9" style={{ display: "flex" }}>
        <Select
          value={value}
          onChange={handleValueChange}
          options={props.options}
          name={props.name}
          styles={{
            ...customSelectStyles,
            container: (base) => ({ ...base, flexGrow: 1 }),
          }}
          placeholder="-- Choose an option --"
        ></Select>
        {props.showAddMore && (
          <button
            type="button"
            className="btn btn-primary maroon-button"
            style={{ marginLeft: "1px" }}
            onClick={props.onAddMore}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

export default CustomSelect;
