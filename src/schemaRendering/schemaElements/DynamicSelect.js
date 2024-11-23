import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import Select from "react-select";

function DynamicSelect(props) {
  const [value, setValue] = useState(props.value || "");
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [options, setOptions] = useState(props.options || []);
  const [isLoading, setIsLoading] = useState(false);
  


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



  useEffect(() => {
    const fetchOptions = async () => {
      if (props.isShown && !isEvaluated && props.retrieverPath) {
        setIsLoading(true);
        try {
          const response = await fetch(
            document.dashboard_url + "/jobs/composer" + `/evaluate_dynamic_select?retriever_path=${encodeURIComponent(
              props.retrieverPath
            )}`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          setOptions(data);
          setIsEvaluated(true);
        } catch (error) {
          console.error("Error fetching select options:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchOptions();
  }, [props.isShown, props.retrieverPath, isEvaluated]);

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
      <div style={{ display: "flex" }}>
        <Select
          menuPortalTarget={document.body}
          menuPosition="fixed"
          value={value}
          onChange={handleValueChange}
          options={options}
          name={props.name}
          isLoading={isLoading}
          styles={{
            ...customSelectStyles,
            container: (base) => ({ ...base, flexGrow: 1 }),
          }}
          placeholder={
            isLoading ? "Loading options..." : "-- Choose an option --"
          }
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

export default DynamicSelect;
