import React, { useState, useRef, useEffect } from "react";

function Module(props) {
  const [value, setValue] = useState("");
  const [modules, setModules] = useState([""]);
  const moduleSearchRef = useRef(null);
  const moduleAddRef = useRef(null);
  const [toolchain, setToolchain] = useState("modules");

  useEffect(() => {
    if (moduleSearchRef.current) {
      $(moduleSearchRef.current).autocomplete({
        delay: 40,
        source: function (request, response) {
          // Suggest URL
          //http://api.railwayapi.com/suggest_train/trains/190/apikey/1234567892/
          // The above url did not work for me so using some existing one
          var suggestURL =
            document.dashboard_url +
            "/jobs/composer/modules?query=%QUERY&toolchain=" +
            toolchain;
          suggestURL = suggestURL.replace("%QUERY", request.term);

          // JSONP Request
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

  function handleAddModule() {
    if (moduleSearchRef.current) {
      const moduleName = $(moduleSearchRef.current).val();
      const toolchainName = getToolchainName(toolchain);

      if (moduleName) {
        const updatedModules = [toolchainName, ...modules.slice(1), moduleName];
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

  useEffect(() => {
    let module_list = "";
    modules.forEach((module) => {
      module_list += module + " ";
    });
    setValue(module_list);
  }, [modules]);

  function handleToolchain(event) {
    setToolchain(event.target.value);
  }

  const toolchains = props.toolchains.map((toolchain) => (
    <option key={toolchain.value} value={toolchain.value}>
      {toolchain.label}
    </option>
  ));

  return (
    <div className="form-group row">
      <label className="col-lg-3 col-form-label form-control-label">
        {props.label}
      </label>
      <div className="col-lg-9 ui-widget">
        <div className="input-group">
          <input
            ref={moduleSearchRef}
            className="form-control ui-autoComplete-input"
            autoComplete="off"
          />

          <div className="input-group-append">
            <select className="form-control" onChange={handleToolchain}>
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
        <input type="hidden" name="module_list" value={value} />
        <button
          type="button"
          className="btn btn-primary mt-2 maroon-button"
          onClick={() => {
            console.log(modules);
          }}
        >
          Show Modules
        </button>
        <button
          type="button"
          className="btn btn-primary mt-2 maroon-button"
          onClick={() => {
            console.log(value);
          }}
        >
          Show Param
        </button>
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
    </div>
  );
}

export default Module;
