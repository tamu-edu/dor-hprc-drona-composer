/**
 * @name Module
 * @description A module selection component that allows users to search and select software modules 
 * from different toolchains. Features autocomplete suggestions from a server, toolchain selection,
 * and visual representation of selected modules as removable badges.
 *
 * @example
 * // Module selection component with multiple toolchains
 * {
 *   "type": "module",
 *   "name": "moduleList",
 *   "label": "Module",
 *   "value": "gcc/9.3.0 openmpi/4.0.5",
 *   "toolchains": [
 *     { "value": "modules", "label": "Modules" },
 *     { "value": "lmod-gcc", "label": "GCC Modules" },
 *     { "value": "lmod-intel", "label": "Intel Modules" }
 *   ],
 *   "toolchainName": "toolchain",
 *   "help": "Search and select software modules for your environment"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} [value] - Default/initial value as space-separated list of modules
 * @property {Array} toolchains - Array of toolchain options, each with value and label properties
 * @property {string} [toolchainName="toolchain"] - Name for the toolchain select input
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useRef, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

function Module(props) {
  const [value, setValue] = useState(props.value || "");
  const [modules, setModules] = useState(() => {
    return props.value ? props.value.trim().split(' ').filter(m => m !== '') : [];
  });
  const [suggestions, setSuggestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [toolchain, setToolchain] = useState("modules");
  const moduleSearchRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const newModules = props.value ? props.value.trim().split(' ').filter(m => m !== '') : [];
    setModules(newModules);
    setValue(props.value || "");
  }, [props.value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const module_list = modules.join(' ');
    if (module_list !== value) {
      setValue(module_list);
      if (props.onChange) {
        props.onChange(props.index, module_list);
      }
    }
  }, [modules]);

  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    try {
      const suggestURL = `${document.dashboard_url}/jobs/composer/modules?query=${query}&toolchain=${toolchain}`;
      const response = await fetch(suggestURL);
      const data = await response.json();
      setSuggestions(data.data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchTerm(query);
    setShowSuggestions(true);
    const timeoutId = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const handleAddModule = () => {
    if (searchTerm) {
      const toolchainName = getToolchainName(toolchain);
      let updatedModules;
      if (modules.length === 0) {
        updatedModules = [toolchainName, searchTerm];
      } else {
        updatedModules = [...modules, searchTerm];
      }
      setModules(updatedModules);
      setSearchTerm("");
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setSearchTerm(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const getToolchainName = (str) => {
    let parts = str.split("-");
    return parts.length > 1 ? parts[1] : "";
  };

  const handleToolchain = (event) => {
    setToolchain(event.target.value);
    setSearchTerm("");
    setSuggestions([]);
  };

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div className="module-widget">
        <div className="input-group" style={{ position: 'relative' }}>
          <input
            ref={moduleSearchRef}
            className="form-control"
            value={searchTerm}
            onChange={handleInputChange}
            autoComplete="off"
            placeholder="Search for modules..."
          />
          <div className="input-group-append">
            <select 
              name={props.toolchainName} 
              className="form-control" 
              onChange={handleToolchain}
              value={toolchain}
            >
              {props.toolchains.map((tc) => (
                <option key={tc.value} value={tc.value}>{tc.label}</option>
              ))}
            </select>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="suggestions-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 1000,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                marginTop: '4px'
              }}
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee'
                  }}
                  onMouseEnter={e => e.target.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-primary mt-2 maroon-button"
          onClick={handleAddModule}
        >
          Add
        </button>
        <input type="hidden" name={props.name} value={value} />
        <div className="mt-2">
          {modules.map((module, index) => (
            <span
              key={index}
              className="badge badge-pill badge-primary module-to-load"
              onClick={() => setModules(modules.filter((_, i) => i !== index))}
              style={{ margin: '0.25rem', cursor: 'pointer' }}
            >
              {module}
            </span>
          ))}
        </div>
      </div>
    </FormElementWrapper>
  );
}

export default Module;
