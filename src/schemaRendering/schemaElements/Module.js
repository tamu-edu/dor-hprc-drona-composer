/**
 * @name Module
 * @description A module selection component that allows users to search and select software modules 
 * from different toolchains. Features autocomplete suggestions from a server, toolchain selection,
 * and visual representation of selected modules as removable badges.
 * The environment creator must set `module_db_root` to a directory the OOD host can read; Drona has no default for it.
 * A toolchain value is the toolchain's module name, e.g. `foss/2024a`, and `""` means no toolchain. Its database is
 * `<module_db_root>/<value>.sqlite3`, e.g. `foss/2024a.sqlite3`; the default (no toolchain) is `modules.sqlite3`.
 * The first module a user adds is preceded by the chosen toolchain, so `foss/2024a` is loaded before it.
 * Without a toolchains list, the dropdown shows the non-empty databases found under `module_db_root`, so each
 * cluster offers what its OOD host has; if the directory is missing, the dropdown is empty. Older values such as
 * `modules-foss/2024a` and `modules`, and databases in `modules-foss/` directories, still work.
 * The Generic environment's `configuration/README` describes how to build the databases with
 * `generate_modules_db.py`. The shared `drona_module_picker.json` component has no `module_db_root`
 * either: an environment that uses it sets the key next to its `$ref`.
 *
 * @example
 * // Module selection; toolchains are listed from the databases under module_db_root
 * {
 *   "type": "module",
 *   "name": "moduleList",
 *   "label": "Module",
 *   "value": "gcc/9.3.0 openmpi/4.0.5",
 *   "module_db_root": "/path/readable/by/ood/modules",
 *   "toolchainName": "toolchain",
 *   "help": "Search and select software modules for your environment"
 * }
 *
 * @example
 * // Pinned toolchain list (value = toolchain module name, "" = none)
 * {
 *   "type": "module",
 *   "name": "moduleList",
 *   "module_db_root": "/path/readable/by/ood/modules",
 *   "toolchains": [
 *     { "label": "No toolchain (default)", "value": "" },
 *     { "label": "foss/2024a", "value": "foss/2024a" }
 *   ]
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} [value] - Default/initial value as space-separated list of modules
 * @property {Array} [toolchains] - Toolchain options, each with value (the toolchain module name, "" for none) and
 *   an optional label (defaults to the value). Omit it to list the toolchains that have a database under
 *   module_db_root; set it to pin a fixed list.
 * @property {string} [toolchainName="toolchain"] - Name for the toolchain select input
 * @property {string} [help] - Help text displayed below the input
 * @property {string} module_db_root - Directory that holds the module databases. Set by the environment creator; no default.
 */

import React, { useState, useRef, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

// A toolchain value is the toolchain's module name ("foss/2024a"); "" = none.
// Older schemas used "modules-foss/2024a" and "modules"; read those the same way.
const LEGACY_TOOLCHAIN_PREFIX = "modules-";

function toolchainModule(value) {
  const v = (value || "").trim();
  if (v === "modules") return "";
  return v.startsWith(LEGACY_TOOLCHAIN_PREFIX) ? v.slice(LEGACY_TOOLCHAIN_PREFIX.length) : v;
}

function Module(props) {
  const [value, setValue] = useState(props.value || "");
  const [modules, setModules] = useState(() => {
    return props.value ? props.value.trim().split(' ').filter(m => m !== '') : [];
  });
  const [suggestions, setSuggestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [toolchain, setToolchain] = useState("");
  const moduleSearchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const moduleDbRoot = props.module_db_root || "";
  const hasStaticToolchains = Array.isArray(props.toolchains) && props.toolchains.length > 0;
  const [toolchains, setToolchains] = useState(hasStaticToolchains ? props.toolchains : []);

  useEffect(() => {
    if (hasStaticToolchains) {
      setToolchains(props.toolchains);
      return;
    }
    let cancelled = false;
    let url = `${document.dashboard_url}/jobs/composer/modules/toolchains`;
    if (moduleDbRoot) {
      url += `?module_db_root=${encodeURIComponent(moduleDbRoot)}`;
    }
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setToolchains(data.data || []);
      })
      .catch((error) => {
        console.error('Error fetching toolchains:', error);
        if (!cancelled) setToolchains([]);
      });
    return () => { cancelled = true; };
  }, [hasStaticToolchains, props.toolchains, moduleDbRoot]);

  // Keep the selection valid when the list changes (default "modules" may be missing).
  useEffect(() => {
    if (toolchains.length > 0 && !toolchains.some((tc) => tc.value === toolchain)) {
      setToolchain(toolchains[0].value);
    }
  }, [toolchains]);

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
      let suggestURL = `${document.dashboard_url}/jobs/composer/modules?query=${encodeURIComponent(query)}&toolchain=${encodeURIComponent(toolchain)}`;
      if (moduleDbRoot) {
	    suggestURL += `&module_db_root=${encodeURIComponent(moduleDbRoot)}`;
      }
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
      // The first module added also loads the toolchain, if one is chosen.
      const toolchainName = toolchainModule(toolchain);
      let updatedModules;
      if (modules.length === 0) {
        updatedModules = toolchainName ? [toolchainName, searchTerm] : [searchTerm];
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
              {toolchains.map((tc) => (
                <option key={tc.value} value={tc.value}>{tc.label || tc.value || "No toolchain (default)"}</option>
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
