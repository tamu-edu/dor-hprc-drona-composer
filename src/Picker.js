import React, { useEffect, useMemo, useState } from "react";

function Picker(props) {
  const defaultLocation = "/scratch/user/" + document.user + "/job_composer/";
  const [value, setValue] = useState(
    props.name == "location" ? defaultLocation : ""
  );

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
  }

  const [currentPath, setCurrentPath] = useState("");

  const [mainPaths, setMainPaths] = useState([]);
  const [subDirs, setSubDirs] = useState([]);
  const [subFiles, setSubFiles] = useState([]);

  useEffect(() => {
    fetch(document.dashboard_url + "/jobs/composer/mainpaths")
      .then((response) => response.json())
      .then((data) => {
        const paths = Object.entries(data);
        setMainPaths(paths);
      });
  }, []);

  function handleMainClick(event) {
    let fullPath = event.target.value;
    setCurrentPath(fullPath);
    fetch(
      document.dashboard_url +
        "/jobs/composer/subdirectories?path=" +
        encodeURIComponent(fullPath),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        const subdirs = Object.entries(data.subdirectories).map((path) => [
          path[1],
          fullPath + "/" + path[1],
        ]);
        const subfiles = Object.entries(data.subfiles).map((path) => [
          path[1],
          fullPath + "/" + path[1],
        ]);
        setSubDirs(subdirs);
        setSubFiles(subfiles);
      });
  }

  function handleSubDirsClick(event) {
    const fullPath = event.target.value;
    setCurrentPath(fullPath);
    fetch(
      document.dashboard_url +
        "/jobs/composer/subdirectories?path=" +
        encodeURIComponent(fullPath),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        const subdirs = Object.entries(data.subdirectories).map((path) => [
          path[1],
          fullPath + "/" + path[1],
        ]);
        const subfiles = Object.entries(data.subfiles).map((path) => [
          path[1],
          fullPath + "/" + path[1],
        ]);
        setSubDirs(subdirs);
        setSubFiles(subfiles);
      });
  }

  function handleSubFilesClick(event) {
    const fullPath = event.target.value;
    setCurrentPath(fullPath);
  }

  function handleBackClick() {
    const path = currentPath.split("/");
    path.pop();
    const newPath = path.join("/");
    setCurrentPath(newPath);
    fetch(
      document.dashboard_url +
        "/jobs/composer/subdirectories?path=" +
        encodeURIComponent(newPath),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        const subdirs = Object.entries(data.subdirectories).map((path) => [
          path[1],
          newPath + "/" + path[1],
        ]);
        const subfiles = Object.entries(data.subfiles).map((path) => [
          path[1],
          newPath + "/" + path[1],
        ]);
        setSubDirs(subdirs);
        setSubFiles(subfiles);
      });
  }

  function handleSaveChange() {
    setValue(currentPath);
    if (props.onChange) props.onChange(props.index, currentPath);
  }

  const isShowFiles = props.showFiles == true ? true : false;

  return (
    <div>
      <div className="form-group row">
        <label
          className="col-lg-3 col-form-label form-control-label"
          htmlFor={props.name}
        >
          {props.label}
        </label>
        <div className="col-lg-9" style={{ display: "flex" }}>
          <button
            type="button"
            className="btn btn-primary maroon-button"
            data-toggle="modal"
            data-target={"#local-file-picker-modal-" + props.name}
            style={{ marginRight: "2px" }}
          >
            Button
          </button>
          <input
            type="text"
            name={props.name}
            id={props.id}
            value={value}
            className="form-control"
            onChange={handleValueChange}
          />
        </div>
      </div>
      <div
        className="modal fade"
        id={"local-file-picker-modal-" + props.name}
        tabIndex="-1"
        role="dialog"
        aria-labelledby="localFilePickerModal"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">
                Modal title
              </h5>
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="container">
                <div className="form-group row">
                  <input
                    type="text"
                    value={currentPath}
                    className="form-control col-lg-10"
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-secondary col-lg-2"
                    onClick={handleBackClick}
                  >
                    Back
                  </button>
                </div>

                {mainPaths.map((path) => (
                  <button
                    key={path[1]}
                    type="button"
                    className="btn btn-primary"
                    value={path[1]}
                    onClick={handleMainClick}
                    style={{ marginRight: "2px", marginBottom: "2px" }}
                  >
                    {path[0]}
                  </button>
                ))}
                <br />
                {subDirs.map((path) => (
                  <button
                    key={path[1]}
                    type="button"
                    className="btn btn-outline-primary"
                    value={path[1]}
                    onClick={handleSubDirsClick}
                    style={{ marginRight: "2px", marginBottom: "2px" }}
                  >
                    {path[0]}
                  </button>
                ))}
                {isShowFiles &&
                  subFiles.map((path) => (
                    <button
                      key={path[1]}
                      type="button"
                      className="btn btn-outline-secondary"
                      value={path[1]}
                      onClick={handleSubFilesClick}
                      style={{ marginRight: "2px", marginBottom: "2px" }}
                    >
                      {path[0]}
                    </button>
                  ))}
                <br />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-dismiss="modal"
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-dismiss="modal"
                onClick={handleSaveChange}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Picker;
