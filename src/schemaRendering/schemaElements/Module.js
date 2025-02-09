import React, { useState, useRef, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

function Module(props) {
  const [value, setValue] = useState(props.value || "");
  const [modules, setModules] = useState(() => {
    return props.value ? props.value.trim().split(' ').filter(m => m !== '') : [];
  });
  const moduleSearchRef = useRef(null);
  const moduleAddRef = useRef(null);
  const [toolchain, setToolchain] = useState("modules");

  useEffect(() => {
    const newModules = props.value.trim().split(' ').filter(m => m !== '');
    setModules(newModules);
    setValue(props.value);
  }, [props.value]);

  useEffect(() => {
     
    setValue(""); 
    setModules([]);
    if (moduleSearchRef.current) {
      $(moduleSearchRef.current).autocomplete({
        delay: 40,
        source: function (request, response) {
          var suggestURL =
            document.dashboard_url +
            "/jobs/composer/modules?query=%QUERY&toolchain=" +
            toolchain;
          suggestURL = suggestURL.replace("%QUERY", request.term);
          $.ajax({
            method: "GET",
            dataType: "json",
            jsonpCallback: "jsonCallback",
            url: suggestURL,
            success: function (data) {
              response(data["data"]);
            },
          });
        },
      });
    }
  }, [toolchain]);

  useEffect(() => {
    const module_list = modules.join(' ');
    if (module_list !== value) {
      setValue(module_list);
      if (props.onChange) {
        props.onChange(props.index, module_list);
      }
    }
  }, [modules]);

  function handleAddModule() {
    if (moduleSearchRef.current) {
      const moduleName = $(moduleSearchRef.current).val();
      const toolchainName = getToolchainName(toolchain);
      if (moduleName) {
        let updatedModules;
        if (modules.length === 0) {
          updatedModules = [toolchainName, moduleName];
        } else {
          updatedModules = [...modules, moduleName];
        }
        setModules(updatedModules);
      }
      moduleSearchRef.current.value = "";
    }
  }

  function getToolchainName(str) {
    let parts = str.split("-");
    if (parts.length > 1) {
      return parts[1];
    } else {
      return "";
    }
  }

  function handleToolchain(event) {
    setToolchain(event.target.value);
  }

  const toolchains = props.toolchains.map((toolchain) => (
    <option key={toolchain.value} value={toolchain.value}>
      {toolchain.label}
    </option>
  ));

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div className="ui-widget">
        <div className="input-group">
          <input
            ref={moduleSearchRef}
            className="form-control ui-autoComplete-input"
            autoComplete="off"
          />
          <div className="input-group-append">
            <select name={props.toolchainName} className="form-control" onChange={handleToolchain}>
              {toolchains}
            </select>
          </div>
        </div>
        <button
          type="button"
          ref={moduleAddRef}
          className="btn btn-primary mt-2 maroon-button"
          onClick={handleAddModule}
        >
          Add
        </button>
        <input type="hidden" name={props.name} value={value} />
        {modules.map((module, index) => (
          <span
            key={index}
            className="badge badge-pill badge-primary module-to-load"
            onClick={() => {
              setModules(modules.filter((_, i) => i !== index));
            }}
          >
            {module}
          </span>
        ))}
      </div>
    </FormElementWrapper>
  );
}

export default Module;
