import React, { useEffect, useMemo, useState, useRef, useContext } from "react";
import { GlobalFilesContext } from "../../GlobalFilesContext";
import FormElementWrapper from "../utils/FormElementWrapper"

function Picker(props) {
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    setValue(props.defaultLocation);
  }, [props.defaultLocation]);

  const [value, setValue] = useState(
    props.name == "location" ? props.defaultLocation : ""
  );

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
  }

  const { globalFiles, setGlobalFiles } = useContext(GlobalFilesContext);

  const [currentPath, setCurrentPath] = useState("");

  const [mainPaths, setMainPaths] = useState([]);
  const [subDirs, setSubDirs] = useState([]);
  const [subFiles, setSubFiles] = useState([]);

  const remoteInput = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let currentFile = remoteInput.current.files[0];
    if (currentFile) {
      let path = currentFile.webkitRelativePath
        ? currentFile.webkitRelativePath
        : currentFile.name;
      inputRef.current.value = path;
      setGlobalFiles((prevFiles) => [...prevFiles, currentFile]);
    }
  }, [uploadedFiles]);
  
  useEffect(() => {
    let url = document.dashboard_url + "/jobs/composer/mainpaths";
    const searchParams = new URLSearchParams();

    const useHPCDefaultPaths = props.useHPCDefaultPaths ?? true;
    searchParams.append('useHPCDefaultPaths', useHPCDefaultPaths);

    if (props.defaultPaths && typeof props.defaultPaths === 'object') {
      searchParams.append('defaultPaths', JSON.stringify(props.defaultPaths));
    }

    url += `?${searchParams.toString()}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const paths = Object.entries(data);
        setMainPaths(paths);
      });
  }, [props.defaultPaths, props.useHPCDefaultPaths]);


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
    // clean up if previous use remote files
    let currentFiles = remoteInput.current.files;
    for (let i = 0; i < currentFiles.length; i++) {
      setUploadedFiles((prevFiles) => {
        let fileToRemove = currentFiles[i];
        let indexToRemove = prevFiles.indexOf(fileToRemove);
        prevFiles.splice(indexToRemove, 1);
        return prevFiles;
      });
      setGlobalFiles((prevFiles) => {
        let fileToRemove = currentFiles[i];
        let indexToRemove = prevFiles.indexOf(fileToRemove);
        prevFiles.splice(indexToRemove, 1);
        return prevFiles;
      });
    }
  }

  function handleFileChange(files) {
    const filesArray = Array.from(files);
    let newFiles = [];
    filesArray.forEach((file) => {
      newFiles.push(file);
      setUploadedFiles((prevFiles) => [...prevFiles, file]);
    });
  }

  function handleRemoteClick() {
    let currentFiles = remoteInput.current.files;
    for (let i = 0; i < currentFiles.length; i++) {
      setUploadedFiles((prevFiles) => {
        let fileToRemove = currentFiles[i];
        let indexToRemove = prevFiles.indexOf(fileToRemove);
        prevFiles.splice(indexToRemove, 1);
        return prevFiles;
      });
      setGlobalFiles((prevFiles) => {
        let fileToRemove = currentFiles[i];
        let indexToRemove = prevFiles.indexOf(fileToRemove);
        prevFiles.splice(indexToRemove, 1);
        return prevFiles;
      });
    }

    remoteInput.current.click();
  }
    
  
  // Returns false if showFiles is undefined, returns true if showFiles is boolean and true or is a string its toLowerCase is "true"
  const isShowFiles = Boolean(props.showFiles) && props.showFiles.toString().toLowerCase() === "true";
  const showRemoteLabel = props.remoteLabel ? true : false;

  return (
    <div>
      <FormElementWrapper
        labelOnTop={props.labelOnTop}
        name={props.name}
        label={props.label}
        help={props.help}
      >
        <div style={{ display: "flex" }}>
          {showRemoteLabel && (
            <button
              type="button"
              className="btn btn-primary maroon-button"
              style={{ marginRight: "2px" }}
              onClick={handleRemoteClick}
            >
              {props.remoteLabel}
            </button>
          )}
          <input
            type="file"
            style={{ display: "none" }}
            multiple
            ref={remoteInput}
            onChange={(e) => handleFileChange(e.target.files)}
          />
          <button
            type="button"
            className="btn btn-primary maroon-button"
            data-toggle="modal"
            data-target={"#local-file-picker-modal-" + props.name}
            style={{ marginRight: "2px" }}
          >
            {props.localLabel}
          </button>
          <input
            type="text"
            name={props.name}
            id={props.id}
            // value={value}
            value={value}
            className="form-control"
            onChange={handleValueChange}
            ref={inputRef}
          />
        </div>
      </FormElementWrapper>
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
                {props.label} 
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
