/**
 * @name Uploader
 * @description A file and directory uploader component that allows users to select and upload 
 * individual files or entire directories. Displays a list of uploaded files and supports 
 * removal of files.
 *
 * @example
 * // File and directory uploader
 * {
 *   "type": "uploader",
 *   "name": "dataFiles",
 *   "label": "Uploader",
 *   "multiple": true,
 *   "acceptedFileTypes": ["text/*", "application/json", ".csv"],
 *   "help": "Upload files or directories with support for multiple file selection"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {Array|string} [value] - Default/initial value, can be array of file objects or JSON string
 * @property {boolean} [multiple=false] - Whether multiple file selection is allowed
 * @property {Array} [acceptedFileTypes] - Array of MIME types or file extensions to accept
 * @property {string} [help] - Help text displayed below the input
 */


import React, { useState, useEffect, useRef, useContext } from "react";
import { GlobalFilesContext } from "../../GlobalFilesContext";
import FormElementWrapper from "../utils/FormElementWrapper";

function Uploader(props) {
  // Initialize with either new files or file objects from previous jobs
  const [uploadedFiles, setUploadedFiles] = useState(() => {
    // If props.value exists and is an array or string, convert to file objects
    if (props.value) {
      try {
        const parsedValue = typeof props.value === 'string'
          ? JSON.parse(props.value)
          : props.value;

        // Convert to array if not already an array
        const valueArray = Array.isArray(parsedValue) ? parsedValue : [parsedValue];

        // Map to file objects with filename and filepath
        return valueArray.map(item => {
          // If item is already an object with filename, use it
          if (typeof item === 'object' && item.filename && item.filepath) {
            return {
              filename: item.filename,
              filepath: item.filepath,
              originalFile: null,  // Placeholder for recreated file
              downloadStatus: 'pending'  // Track download status
            };
          }

          // If item is a string, treat it as filename
          return {
            filename: typeof item === 'string' ? item : '',
            filepath: '/dummy/path',
            originalFile: null,
            downloadStatus: 'pending'
          };
        });
      } catch (error) {
        console.error('Error parsing props.value:', error);
        return [];
      }
    }
    return [];
  });

  const { globalFiles, setGlobalFiles } = useContext(GlobalFilesContext);
  const fileInput = useRef(null);
  const folderInput = useRef(null);

  // Effect to recreate files from filepath
  useEffect(() => {
    const recreateFilesFromPaths = async () => {
      const newFiles = await Promise.all(uploadedFiles.map(async (file) => {
        // Skip if file is already a File object or filepath is dummy
        if (file.originalFile || file.filepath === '/dummy/path' || file.downloadStatus === 'downloading') {
          return file;
        }

        try {
          // Update status to prevent multiple simultaneous downloads
          const updatedFile = { 
            ...file, 
            downloadStatus: 'downloading' 
          };

          // Call backend to download file
          const response = await fetch(`${document.dashboard_url}/jobs/composer/download_file`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filepath: file.filepath })
          });

          if (!response.ok) {
            throw new Error('File download failed');
          }
          
          // Get file blob
          const blob = await response.blob();
          
          // Create a File object 
          const recreatedFile = new File([blob], file.filename, {
            type: blob.type || 'application/octet-stream'
          });

          return {
            ...updatedFile,
            originalFile: recreatedFile,
            downloadStatus: 'completed'
          };
        } catch (error) {
          console.error(`Failed to recreate file from path: ${file.filepath}`, error);
          return { 
            ...file, 
            downloadStatus: 'failed' 
          };
        }
      }));

      const hasChanges = newFiles.some(
        (file, index) => 
          file.originalFile !== uploadedFiles[index].originalFile ||
          file.downloadStatus !== uploadedFiles[index].downloadStatus
      );

      if (hasChanges) {
        setUploadedFiles(newFiles);
        
        // Update global files with newly recreated files
        const newOriginalFiles = newFiles
          .filter(file => file.originalFile instanceof File)
          .map(file => file.originalFile);
        
        setGlobalFiles(prevFiles => {
          // Remove previous dummy files and add new ones
          const filteredPrevFiles = prevFiles.filter(
            f => !uploadedFiles.some(uf => uf.filename === f.name)
          );
          return [...filteredPrevFiles, ...newOriginalFiles];
        });
      }
    };

    recreateFilesFromPaths();
  }, [uploadedFiles]);

  useEffect(() => {
    if(!props.value) return;

    try {
      const parsedValue = typeof props.value === 'string'
        ? JSON.parse(props.value)
        : props.value;

      const valueArray = Array.isArray(parsedValue) ? parsedValue : [parsedValue];

      // Convert to file objects
      const normalizedValueArray = valueArray.map(item => {
        if (typeof item === 'object' && item.filename && item.filepath) {
          return {
            filename: item.filename,
            filepath: item.filepath,
            originalFile: null,
            downloadStatus: 'pending'
          };
        }

        return {
          filename: typeof item === 'string' ? item : '',
          filepath: '/dummy/path',
          originalFile: null,
          downloadStatus: 'pending'
        };
      });

      // Compare stringified versions to avoid unnecessary updates
      const valueStr = JSON.stringify(normalizedValueArray);
      const filesStr = JSON.stringify(uploadedFiles);

      if (valueStr !== filesStr) {
        setUploadedFiles(normalizedValueArray);
      }
    } catch (error) {
      console.error('Error processing props.value:', error);
    }
  }, [props.value]);

  // "file" or "folder" — tracks which mode the button currently triggers
  const [uploadMode, setUploadMode] = useState("file");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const modeLabel = uploadMode === "file" ? "Add File" : "Add Directory";

  function handleMainButtonClick() {
    if (uploadMode === "file") {
      fileInput.current.click();
    } else {
      folderInput.current.click();
    }
  }

  function handleSelectMode(mode) {
    setUploadMode(mode);
    setDropdownOpen(false);
  }

  function handleFileChange(files) {
    const filesArray = Array.from(files).map(file => ({
      filename: file.webkitRelativePath || file.name,
      filepath: '/dummy/path',
      originalFile: file
    }));

    const newUploadedFiles = [...uploadedFiles, ...filesArray];
    setUploadedFiles(newUploadedFiles);
    setGlobalFiles(prevFiles => [...prevFiles, ...filesArray.map(f => f.originalFile)]);
    
    if (props.onChange) {
      const jsonValue = newUploadedFiles.length > 0 
        ? JSON.stringify(newUploadedFiles.map(file => ({
            filename: file.filename,
            filepath: file.filepath
          })))
        : "";
      props.onChange(props.index, jsonValue);
    }
  }

  function removeFile(index) {
    const fileToRemove = uploadedFiles[index];

    if (fileToRemove.originalFile instanceof File) {
      // Handle File object removal
      setGlobalFiles((prevFiles) => {
        const newFiles = [...prevFiles];
        const fileIndex = newFiles.indexOf(fileToRemove.originalFile);
        if (fileIndex !== -1) {
          newFiles.splice(fileIndex, 1);
        }
        return newFiles;
      });
    }

    const newUploadedFiles = [...uploadedFiles];
    newUploadedFiles.splice(index, 1);
    setUploadedFiles(newUploadedFiles);
    
    // Update form state for conditional evaluation
    if (props.onChange) {
      const jsonValue = newUploadedFiles.length > 0 
        ? JSON.stringify(newUploadedFiles.map(file => ({
            filename: file.filename,
            filepath: file.filepath
          })))
        : "";
      props.onChange(props.index, jsonValue);
    }
  }

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      {/* Split dropdown: main button triggers selected mode, arrow lets you switch */}
      <div style={{ position: "relative", display: "inline-block" }} ref={dropdownRef}>
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-primary maroon-button"
            onClick={handleMainButtonClick}
          >
            {modeLabel}
          </button>
          <button
            type="button"
            className="btn btn-primary maroon-button dropdown-toggle dropdown-toggle-split"
            onClick={() => setDropdownOpen((o) => !o)}
          >
            <span className="sr-only">Toggle Dropdown</span>
          </button>
        </div>

        {/* Dropdown menu — clean list style matching image 2 */}
        {dropdownOpen && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 1000,
            background: "#fff",
            minWidth: "180px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            borderRadius: "4px",
            padding: "4px 0",
            marginTop: "2px",
          }}>
            <button
              type="button"
              onClick={() => handleSelectMode("file")}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 16px", fontSize: "14px",
                background: uploadMode === "file" ? "#f5f5f5" : "none",
                border: "none", cursor: "pointer", color: "#333",
              }}
            >
              Add File
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode("folder")}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 16px", fontSize: "14px",
                background: uploadMode === "folder" ? "#f5f5f5" : "none",
                border: "none", cursor: "pointer", color: "#333",
              }}
            >
              Add Directory
            </button>
          </div>
        )}
      </div>

      <input
        type="file"
        style={{ display: "none" }}
        multiple
        ref={fileInput}
        onChange={(e) => handleFileChange(e.target.files)}
      />
      <input
        type="file"
        multiple="multiple"
        webkitdirectory="true"
        directory="true"
        style={{ display: "none" }}
        ref={folderInput}
        onChange={(e) => handleFileChange(e.target.files)}
      />
      <div
        style={{
          border: uploadedFiles.length ? "1px solid LightGray" : "none",
          borderRadius: "2px",
        }}
      >
        {uploadedFiles.map((file, index) => (
          <div key={index} onClick={() => removeFile(index)}>
            {file.filename}
            {file.downloadStatus === 'downloading' && ' (Downloading...)'}
            {file.downloadStatus === 'failed' && ' (Download Failed)'}
          </div>
        ))}
      </div>

      <input
        type="hidden"
        name={props.name}
        value={JSON.stringify(uploadedFiles.map(file => ({
          filename: file.filename,
          filepath: file.filepath
        })))}
      />
    </FormElementWrapper>
  );
}

export default Uploader;