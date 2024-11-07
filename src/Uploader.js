import React, { useState, useEffect, useRef, useContext } from "react";
import { GlobalFilesContext } from "./index.js";
import FormElementWrapper from "./FormElementWrapper";

function Uploader(props) {
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const { globalFiles, setGlobalFiles } = useContext(GlobalFilesContext);

  const fileInput = useRef(null);
  const folderInput = useRef(null);
  const selectRef = useRef(null);

  useEffect(() => {
    if (props.onChange) {
      props.onChange(uploadedFiles, globalFiles);
    }
  }, [uploadedFiles]);

  function handleAdd() {
    const option = selectRef.current.value;
    if (option === "file") {
      fileInput.current.click();
    } else if (option === "folder") {
      folderInput.current.click();
    } else {
      alert("Please select a file or folder");
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

  function showFiles() {
    console.log(uploadedFiles);
  }

  function removeFile(index) {
    const fileToRemove = uploadedFiles[index];
    setGlobalFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      const fileIndex = newFiles.indexOf(fileToRemove);
      newFiles.splice(fileIndex, 1);
      return newFiles;
    });
    setUploadedFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      newFiles.splice(index, 1);
      return newFiles;
    });
  }

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
        <select defaultValue={"default"} ref={selectRef}>
          <option value="default" disabled>
            Select an option
          </option>
          <option value="file">File</option>
          <option value="folder">Directory</option>
        </select>
        <button type="button" className="maroon-button" onClick={handleAdd}>
          Add
        </button>
        <input
          type="file"
          style={{ display: "none" }}
          multiple
          ref={fileInput}
          onChange={(e) => handleFileChange(e.target.files)}
        ></input>
        <input
          type="file"
          multiple="multiple"
          webkitdirectory="true"
          directory="true"
          style={{ display: "none" }}
          ref={folderInput}
          onChange={(e) => handleFileChange(e.target.files)}
        ></input>
        <div
          style={{
            border: uploadedFiles.length ? "1px solid LightGray" : "none",
            borderRadius: "2px",
          }}
        >
          {uploadedFiles.map((file, index) => (
            <div key={index} onClick={() => removeFile(index)}>
              {file.webkitRelativePath ? file.webkitRelativePath : file.name}
            </div>
          ))}
        </div>
     </FormElementWrapper>
  );
}
export default Uploader;
