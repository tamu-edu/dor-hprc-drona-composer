import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { customSelectStyles } from "../utils/selectStyles";
import Select from "react-select";

function DynamicSelect(props) {
  const [value, setValue] = useState(props.value || "");
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [options, setOptions] = useState(props.options || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isValueInvalid, setIsValueInvalid] = useState(false);

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  // Validate value against options
  useEffect(() => {
    if (isEvaluated && value) {
      const isValueValid = options.some(option => option.value === value.value);
      setIsValueInvalid(!isValueValid);
      
      if (!isValueValid) {
        // Add the current value to options with an indicator
        setOptions(prevOptions => [
          ...prevOptions,
          {
            ...value,
            label: `${value.label} (Unavailable)`,
            isDeprecated: true,
            styles: {
              color: '#dc3545',  // Bootstrap danger color
              fontStyle: 'italic'
            }
          }
        ]);
      }
    }
  }, [options, value, isEvaluated]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (props.isShown && !isEvaluated && props.retrieverPath) {
        setIsLoading(true);
        try {
          const response = await fetch(
            document.dashboard_url + 
            "/jobs/composer" + 
            `/evaluate_dynamic_select?retriever_path=${encodeURIComponent(props.retrieverPath)}`
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw {
              message: errorData.message || 'Failed to retrieve select options',
              status_code: response.status,
              details: errorData.details || errorData
            };
          }

          const data = await response.json();
          setOptions(data);
          setIsEvaluated(true);
        } catch (error) {
          props.setError(error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchOptions();
  }, [props.isShown, props.retrieverPath, isEvaluated]);

  const handleValueChange = (option) => {
    setValue(option);
    setIsValueInvalid(false); // Reset invalid state on user change
    if (props.onChange) {
      props.onChange(props.index, option);
    }
  };

  const getNoOptionsMessage = () => {
    if (isLoading) return "Loading options...";
    if (isEvaluated && options.length === 0) return "No options available";
    return "No options found";
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
            control: (base, state) => ({
              ...customSelectStyles.control(base, state),
              ...(isValueInvalid && {
                borderColor: '#dc3545',
                '&:hover': {
                  borderColor: '#bd2130'
                }
              })
            }),
            container: (base) => ({ ...base, flexGrow: 1 }),
          }}
          noOptionsMessage={getNoOptionsMessage}
          placeholder={isLoading ? "Loading options..." : "-- Choose an option --"}
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
      {isValueInvalid && (
        <div className="text-danger" style={{ fontSize: '0.875em', marginTop: '0.25rem' }}>
          This option may no longer be available
        </div>
      )}
    </FormElementWrapper>
  );
}

export default DynamicSelect;

