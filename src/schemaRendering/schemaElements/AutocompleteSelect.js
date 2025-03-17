import React, { useState, useEffect, useRef } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { customSelectStyles } from "../utils/selectStyles";
import Select from "react-select";

function AutocompleteSelect(props) {
  const [inputValue, setInputValue] = useState("");
  const [value, setValue] = useState(props.value || "");
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isValueInvalid, setIsValueInvalid] = useState(false);
  
  const debounceTimerRef = useRef(null);
  const minCharsToSearch = 2;

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  useEffect(() => {
    if (value && options.length > 0) {
      const isValueValid = options.some(option => option.value === value.value);
      setIsValueInvalid(!isValueValid);

      if (!isValueValid) {
        setOptions(prevOptions => [
          ...prevOptions,
          {
            ...value,
            label: `${value.label} (Unavailable)`,
            isDeprecated: true,
            styles: {
              color: '#dc3545',
              fontStyle: 'italic'
            }
          }
        ]);
      }
    }
  }, [options, value]);

  const fetchResults = async (query) => {
    if (!query || query.length < minCharsToSearch) {
      setOptions([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const retrieverPath = props.retrieverPath || props.retriever;
      
      if (!retrieverPath) {
        throw new Error("Retriever path is not set");
      }

      const response = await fetch(
        `${document.dashboard_url}/jobs/composer/evaluate_autocomplete?retriever_path=${encodeURIComponent(retrieverPath)}&query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw {
          message: errorData.message || 'Failed to retrieve search options',
          status_code: response.status,
          details: errorData.details || errorData
        };
      }
      
      const data = await response.json();
      setOptions(data);
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message || "Search failed");
      if (props.setError) {
        props.setError({
          message: "Failed to retrieve search results",
          status_code: err.status_code || 500,
          details: err.details || { error: err.message || "Unknown error" }
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (newValue) => {
    setInputValue(newValue);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      fetchResults(newValue);
    }, 300);
  };

  const handleChange = (selectedOption) => {
    setValue(selectedOption);
    setIsValueInvalid(false);
    if (props.onChange) {
      props.onChange(props.index, selectedOption);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const getNoOptionsMessage = ({ inputValue }) => {
    if (inputValue.length < minCharsToSearch) return `Type at least ${minCharsToSearch} characters to search`;
    if (isLoading) return "Loading...";
    if (error) return "Error loading results";
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
          inputValue={inputValue}
          onInputChange={handleInputChange}
          value={value}
          onChange={handleChange}
          options={options}
          isLoading={isLoading}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          name={props.name}
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
          placeholder={props.placeholder || "Type to search..."}
          noOptionsMessage={getNoOptionsMessage}
          loadingMessage={() => "Loading results..."}
          isClearable
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
      {error && !isLoading && !isValueInvalid && (
        <div className="text-danger" style={{ fontSize: '0.875em', marginTop: '0.25rem' }}>
          Error: {error}
        </div>
      )}
    </FormElementWrapper>
  );
}

export default AutocompleteSelect;
