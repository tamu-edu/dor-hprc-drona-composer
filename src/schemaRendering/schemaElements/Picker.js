/**
 * @name Picker
 * @description A file and directory picker component that allows users to browse and select 
 * files or directories from both local and remote locations. Features a modal browser interface 
 * for navigating directory structures.
 *
 * @example
 * // File/directory picker with both local and remote options
 * {
 *   "type": "picker",
 *   "name": "outputLocation",
 *   "label": "Picker",
 *   "localLabel": "Browse Directories",
 *   "remoteLabel": "Upload File",
 *   "showFiles": "true",
 *   "allowedFileTypes": "csv,txt,json",
 *   "defaultLocation": "$HOME",
 *   "defaultPaths": {
 *     "HomeCustom": "$HOME"
 *   },
 *   "useHPCDefaultPaths": true,
 *   "help": "Select a file or directory location"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} localLabel - Label for the local file browser button
 * @property {string} [remoteLabel] - Label for remote file upload button (if omitted, remote upload option isn't shown)
 * @property {string|boolean} [showFiles="false"] - Whether to show files in directory listings ("true" or "false")
 * @property {string} [allowedFileTypes] - Comma-separated list of file extensions to allow (e.g. "csv,txt,json"); non-matching files are hidden from the browser. Leading dots are optional, matching is case-insensitive, and directories are always shown regardless of this filter.
 * @property {string|boolean} [showHidden=true] - Whether to include dot-prefixed hidden files and directories (e.g. ".git", ".config") in the browser listing ("true" or "false")
 * @property {string|boolean} [multiple=false] - When true, each browse adds one more file/directory to a list instead of replacing a single value. The submitted value becomes a colon-joined string of the chosen full paths (e.g. "/scratch/a:/scratch/b"), matching shell $PATH-style lists. Single-select behavior (a plain path string) is unchanged when this is left unset.
 * @property {string} [defaultLocation] - Default path to show in the input field
 * @property {Object} [defaultPaths] - Custom paths to show as quick access buttons (key:label, value:path)
 * @property {boolean} [useHPCDefaultPaths=true] - Whether to use system default paths
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useEffect, useMemo, useState, useRef, useContext } from "react";
import { GlobalFilesContext } from "../../GlobalFilesContext";
import FormElementWrapper from "../utils/FormElementWrapper"

// Styles for the directory-browser modal body, matching the maroon (#500000)
// branding and breadcrumb/list-row pattern used by AddFileModal.js.
const S = {
  headerBtnRow: { display: "flex", gap: "8px" },
  cancelBtn: {
    padding: "5px 14px", fontSize: "12px", fontWeight: "500",
    backgroundColor: "white", color: "#500000",
    border: "1px solid #500000", borderRadius: "4px", cursor: "pointer",
  },
  selectBtn: (disabled) => ({
    padding: "5px 14px", fontSize: "12px", fontWeight: "500",
    backgroundColor: disabled ? "#ccc" : "#500000",
    border: `1px solid ${disabled ? "#ccc" : "#500000"}`,
    borderRadius: "4px", color: "white",
    cursor: disabled ? "default" : "pointer",
  }),
  quickAccessRow: { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" },
  quickAccessBtn: {
    padding: "4px 12px", fontSize: "12px", fontWeight: "500",
    backgroundColor: "white", color: "#500000",
    border: "1px solid #500000", borderRadius: "14px", cursor: "pointer",
  },
  breadcrumb: {
    display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2px",
    padding: "6px 10px", backgroundColor: "#f8f9fa",
    border: "1px solid #dee2e6", borderRadius: "4px", marginBottom: "10px",
    fontSize: "13px", minHeight: "32px",
  },
  crumbBtn: (isLast) => ({
    background: "none", border: "none", padding: "2px 4px",
    fontSize: "13px", cursor: isLast ? "default" : "pointer",
    color: isLast ? "#495057" : "#500000",
    fontWeight: isLast ? "600" : "400",
    borderRadius: "3px",
  }),
  fileList: {
    border: "1px solid #dee2e6", borderRadius: "4px",
    overflowY: "auto", maxHeight: "320px", minHeight: "120px",
    backgroundColor: "white",
  },
  entry: (selected) => ({
    display: "flex", alignItems: "center", gap: "10px",
    padding: "6px 12px", fontSize: "13px", cursor: "pointer",
    backgroundColor: selected ? "#fff0f0" : "transparent",
    borderBottom: "1px solid #f0f0f0",
  }),
  entryIcon: (isDir) => ({
    fontSize: isDir ? "15px" : "13px", flexShrink: 0, width: "16px", textAlign: "center",
    // Folder amber vs. plain-gray file matches the universal file-manager
    // convention. Both shades are picked to clear ~4.5:1 contrast on white
    // (WCAG AA) — a plain gold/light-gray pair reads nicely but fails that
    // check, so these are darkened versions of the same hues.
    color: isDir ? "#8a6300" : "#6c757d",
  }),
  entryName: (isDir) => ({
    flex: 1, minWidth: 0, color: isDir ? "#212529" : "#495057",
    fontWeight: isDir ? "600" : "400",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  }),
  entryChevron: { fontSize: "11px", color: "#adb5bd", flexShrink: 0 },
  empty: { padding: "24px 16px", textAlign: "center", fontSize: "13px", color: "#6c757d" },
  loadingRow: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "4px 0 12px", fontSize: "13px", color: "#500000",
  },
  selectedBar: {
    marginTop: "10px", padding: "8px 12px",
    backgroundColor: "#f8f9fa", border: "1px solid #dee2e6",
    borderRadius: "4px", display: "flex", alignItems: "center", gap: "8px",
  },
  selectedPath: {
    fontSize: "13px", color: "#495057", flex: 1,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    fontFamily: "monospace",
  },
  filterHint: {
    fontSize: "12px", color: "#6c757d", fontStyle: "italic",
    marginBottom: "6px",
  },
  // One full path per row (matches the single-select field's own
  // full-path display) instead of truncated pills, with a real, clearly
  // clickable remove button per row rather than a small bare icon.
  multiList: {
    flex: 1, minWidth: 0, border: "1px solid #dee2e6", borderRadius: "4px",
    maxHeight: "160px", overflowY: "auto", backgroundColor: "white",
  },
  multiRow: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "6px 10px", fontSize: "13px", color: "#495057",
    fontFamily: "monospace", borderBottom: "1px solid #f0f0f0",
  },
  multiRowPath: {
    flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  // Plain "−" glyph, gray by default (subtle) but at ~4.7:1 contrast on
  // white so it's not mistaken for background noise; a light-pink hover
  // fill (same convention as the folder/file row hover) makes it obviously
  // interactive without needing a heavy filled default state.
  multiRemoveBtn: {
    flexShrink: 0, border: "none", background: "transparent", color: "#6c757d",
    cursor: "pointer", width: "22px", height: "22px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "16px", fontWeight: "600", lineHeight: 1, padding: 0,
  },
  pillEmpty: { fontSize: "12px", color: "#6c757d", fontStyle: "italic" },
  // Circle border follows the button's own text color (maroon normally,
  // white on the .maroon-button hover state), so it stays visible either way.
  plusBadge: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "16px", height: "16px", borderRadius: "50%",
    border: "1.5px solid currentColor", fontSize: "11px", fontWeight: "700",
    marginRight: "6px", lineHeight: 1, flexShrink: 0,
  },
  countBadge: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: "18px", height: "18px", padding: "0 5px",
    borderRadius: "9px", fontSize: "11px", fontWeight: "700",
    marginLeft: "8px", backgroundColor: "white", color: "#500000",
  },
};

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
  const [mainPathsError, setMainPathsError] = useState(null);
  const [isLoadingMainPaths, setIsLoadingMainPaths] = useState(false);
  const [subDirs, setSubDirs] = useState([]);
  const [subFiles, setSubFiles] = useState([]);
  const [selectedFilePath, setSelectedFilePath] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [browseError, setBrowseError] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [multiValues, setMultiValues] = useState([]);

  const remoteInput = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const dirCacheRef = useRef(new Map());

  useEffect(() => {
    let currentFile = remoteInput.current.files[0];
    if (currentFile) {
      let path = currentFile.webkitRelativePath
        ? currentFile.webkitRelativePath
        : currentFile.name;
      inputRef.current.value = path;
      setValue(path);
      setGlobalFiles((prevFiles) => [...prevFiles, currentFile]);
      if (props.onChange) {
        props.onChange(props.index, path);
      }
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

    setMainPathsError(null);
    setIsLoadingMainPaths(true);
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load quick-access paths (${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        const paths = Object.entries(data);
        setMainPaths(paths);
      })
      .catch((err) => {
        setMainPathsError(err.message || "Failed to load quick-access paths");
      })
      .finally(() => {
        setIsLoadingMainPaths(false);
      });
  }, [props.defaultPaths, props.useHPCDefaultPaths]);

  // Shared directory-listing fetch used by quick-access, sub-dir, and breadcrumb
  // navigation. Caches per-path (and per-filter) results (so revisiting a
  // directory doesn't re-hit the network) and cancels any in-flight request
  // before starting a new one, so a fast double-click can't let a stale
  // response overwrite a newer one.
  function navigateTo(path) {
    setCurrentPath(path);
    setSelectedFilePath(null);
    setBrowseError(null);

    const cacheKey = path + "::" + allowedExtensions.join(",") + "::" + isShowHidden;
    const cached = dirCacheRef.current.get(cacheKey);
    if (cached) {
      setSubDirs(cached.subdirs);
      setSubFiles(cached.subfiles);
      setTruncated(cached.truncated);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    fetch(
      document.dashboard_url +
      "/jobs/composer/subdirectories?path=" +
      encodeURIComponent(path) +
      "&showFiles=" + isShowFiles +
      "&showHidden=" + isShowHidden +
      (allowedExtensions.length ? "&fileTypes=" + encodeURIComponent(allowedExtensions.join(",")) : ""),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to list directory (${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        const subdirs = data.subdirectories.map((name) => [name, path + "/" + name]);
        const subfiles = data.subfiles.map((name) => [name, path + "/" + name]);
        dirCacheRef.current.set(cacheKey, { subdirs, subfiles, truncated: !!data.truncated });
        setSubDirs(subdirs);
        setSubFiles(subfiles);
        setTruncated(!!data.truncated);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setBrowseError(err.message || "Failed to load directory listing");
        setSubDirs([]);
        setSubFiles([]);
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      });
  }

  function handleMainClick(event) {
    navigateTo(event.target.value);
  }

  function selectFile(path) {
    setCurrentPath(path);
    setSelectedFilePath(path);
  }

  // Lets the folder/file rows (styled divs, not native buttons) respond to
  // Enter/Space like a real button, since they carry role="button" for
  // keyboard and screen-reader users.
  function handleRowKeyDown(event, action) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  }

  // Breadcrumb trail for the current browsing path, e.g. "/scratch/user/x" ->
  // [{label:"/", path:"/"}, {label:"scratch", path:"/scratch"}, ...]. Clicking
  // any non-last crumb navigates there, replacing the old raw-text-box + Back
  // button UI.
  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [];
    const parts = currentPath.split("/").filter(Boolean);
    const crumbs = [{ label: "/", path: "/" }];
    let acc = "";
    for (const part of parts) {
      acc += "/" + part;
      crumbs.push({ label: part, path: acc });
    }
    return crumbs;
  }, [currentPath]);

  function handleSaveChange() {
    if (!currentPath) return;
    if (isMultiple) {
      // Same modal, same "pick one and close" click — the only difference
      // from single-select is that this appends to a running list instead
      // of overwriting the one value. Duplicates are silently ignored.
      setMultiValues((prev) => (prev.includes(currentPath) ? prev : [...prev, currentPath]));
      return;
    }
    setValue(currentPath);
    if (props.onChange) props.onChange(props.index, currentPath);
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

  function handleFileChange(files) {
    const filesArray = Array.from(files);
    let newFiles = [];
    filesArray.forEach((file) => {
      newFiles.push(file);
      setUploadedFiles((prevFiles) => [...prevFiles, file]);
    });
  }

  // Returns false if showFiles is undefined, returns true if showFiles is boolean and true or is a string its toLowerCase is "true"
  const isShowFiles = Boolean(props.showFiles) && props.showFiles.toString().toLowerCase() === "true";

  // Normalized extension allowlist (lowercase, no leading dot) parsed from the
  // "csv,txt,json" style prop. Filtering happens server-side (see navigateTo),
  // this is only used to build the request and the "showing only" hint below.
  const allowedExtensions = useMemo(() => {
    if (!props.allowedFileTypes) return [];
    return props.allowedFileTypes
      .split(",")
      .map((ext) => ext.trim().replace(/^\./, "").toLowerCase())
      .filter(Boolean);
  }, [props.allowedFileTypes]);

  // Defaults to true (unlike showFiles/allowedFileTypes) so existing pickers
  // keep their current behavior — hidden entries only disappear once this is
  // explicitly set to "false".
  const isShowHidden = props.showHidden === undefined || props.showHidden === null
    || props.showHidden.toString().toLowerCase() !== "false";
  const isMultiple = Boolean(props.multiple) && props.multiple.toString().toLowerCase() === "true";
  const showRemoteLabel = props.remoteLabel ? true : false;

  function removeMultiValue(path) {
    if (props.disableChange) return;
    setMultiValues((prev) => prev.filter((p) => p !== path));
  }

  // Multi-select value is a colon-joined string of full paths (shell
  // $PATH-style), recomputed whenever the list changes — same pattern
  // Module.js uses for its space-joined module list.
  useEffect(() => {
    if (!isMultiple) return;
    if (props.onChange) props.onChange(props.index, multiValues.filter(Boolean).join(":"));
  }, [multiValues, isMultiple]);

  // "local" = open cluster browser modal, "remote" = upload local file
  const [pickerMode, setPickerMode] = useState("local");
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

  const currentLabel = pickerMode === "local" ? props.localLabel : props.remoteLabel;

  function handleMainButtonClick() {
    if (props.disableChange) return;
    if (pickerMode === "local") {
      const modalEl = document.getElementById("local-file-picker-modal-" + props.name);
      if (modalEl && window.$) window.$(modalEl).modal("show");
    } else {
      handleRemoteClick();
    }
  }

  function handleSelectMode(mode) {
    setPickerMode(mode);
    setDropdownOpen(false);
  }

  return (
    <div>
      <FormElementWrapper
        labelOnTop={props.labelOnTop}
        name={props.name}
        label={props.label}
        help={props.help}
        useLabel={props.useLabel}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div style={{ position: "relative" }} ref={dropdownRef}>
            {/* Main action button */}
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-primary maroon-button"
                onClick={handleMainButtonClick}
                style={{ cursor: props.disableChange ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                disabled={props.disableChange}
              >
                {isMultiple && <span style={S.plusBadge} aria-hidden="true">+</span>}
                {currentLabel}
                {isMultiple && multiValues.length > 0 && (
                  <span style={S.countBadge}>{multiValues.length}</span>
                )}
              </button>
              {showRemoteLabel && (
                <button
                  type="button"
                  className="btn btn-primary maroon-button dropdown-toggle dropdown-toggle-split"
                  onClick={() => setDropdownOpen((o) => !o)}
                  disabled={props.disableChange}
                >
                  <span className="sr-only">Toggle Dropdown</span>
                </button>
              )}
            </div>

            {/* Dropdown menu — styled like image 2: plain list, shadow, no Bootstrap box */}
            {showRemoteLabel && dropdownOpen && (
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
                  onClick={() => handleSelectMode("local")}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 16px", fontSize: "14px",
                    background: pickerMode === "local" ? "#f5f5f5" : "none",
                    border: "none", cursor: "pointer", color: "#333",
                  }}
                >
                  {props.localLabel}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMode("remote")}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 16px", fontSize: "14px",
                    background: pickerMode === "remote" ? "#f5f5f5" : "none",
                    border: "none", cursor: "pointer", color: "#333",
                  }}
                >
                  {props.remoteLabel}
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            style={{ display: "none" }}
            multiple
            ref={remoteInput}
            onChange={(e) => handleFileChange(e.target.files)}
          />

          {isMultiple ? (
            <>
              <input type="hidden" name={props.name} id={props.id} value={multiValues.filter(Boolean).join(":")} />
              {multiValues.length === 0 ? (
                <span style={S.pillEmpty}>
                  None added yet — click {currentLabel} to add one, or more than one
                </span>
              ) : (
                <div style={S.multiList}>
                  {multiValues.map((path) => (
                    <div key={path} style={S.multiRow} title={path}>
                      <span style={S.multiRowPath}>{path}</span>
                      {!props.disableChange && (
                        <button
                          type="button"
                          aria-label={`Remove ${path}`}
                          style={S.multiRemoveBtn}
                          onClick={() => removeMultiValue(path)}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#fff0f0";
                            e.currentTarget.style.color = "#500000";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#6c757d";
                          }}
                        >
                          &minus;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <input
              type="text"
              name={props.name}
              id={props.id}
              value={value}
              className="form-control"
              onChange={handleValueChange}
              ref={inputRef}
              readOnly={props.disableChange}
            />
          )}
        </div>
      </FormElementWrapper>

      <div
        className="modal fade"
        id={"local-file-picker-modal-" + props.name}
        tabIndex="-1"
        role="dialog"
        aria-labelledby={"local-file-picker-modal-label-" + props.name}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header" style={{ position: "sticky", top: "0", zIndex: "3" }}>
              <h5 className="modal-title" id={"local-file-picker-modal-label-" + props.name}>
                {props.label}
              </h5>
              <div style={S.headerBtnRow}>
                <button
                  type="button"
                  style={S.cancelBtn}
                  data-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={S.selectBtn(!currentPath)}
                  disabled={!currentPath}
                  data-dismiss="modal"
                  onClick={handleSaveChange}
                >
                  {isMultiple ? "Add" : "Select"}
                </button>
              </div>
            </div>
            <div className="modal-body">
              <div className="container">
                {mainPathsError && (
                  <div className="alert alert-warning py-1 px-2" role="alert" style={{ fontSize: "13px" }}>
                    {mainPathsError}
                  </div>
                )}
                {isLoadingMainPaths ? (
                  <div style={S.loadingRow}>
                    <span className="spinner-border spinner-border-sm" style={{ color: "#500000" }} role="status" aria-hidden="true"></span>
                    Loading locations&hellip;
                  </div>
                ) : (
                  <div style={S.quickAccessRow}>
                    {mainPaths.map((path) => (
                      <button
                        key={path[1]}
                        type="button"
                        value={path[1]}
                        onClick={handleMainClick}
                        disabled={isLoading}
                        style={S.quickAccessBtn}
                      >
                        {path[0]}
                      </button>
                    ))}
                  </div>
                )}

                {breadcrumbs.length > 0 && (
                  <div style={S.breadcrumb}>
                    {breadcrumbs.map((crumb, i) => (
                      <React.Fragment key={crumb.path}>
                        {i > 0 && <span style={{ color: "#adb5bd" }}>/</span>}
                        <button
                          type="button"
                          style={S.crumbBtn(i === breadcrumbs.length - 1)}
                          onClick={() => i < breadcrumbs.length - 1 && navigateTo(crumb.path)}
                          disabled={isLoading}
                        >
                          {crumb.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {isShowFiles && allowedExtensions.length > 0 && (
                  <div style={S.filterHint}>
                    Showing only: {allowedExtensions.map((ext) => "." + ext).join(", ")}
                  </div>
                )}

                {browseError && (
                  <div className="alert alert-danger py-1 px-2" role="alert" style={{ fontSize: "13px" }}>
                    {browseError}
                  </div>
                )}
                {truncated && !browseError && (
                  <div className="alert alert-warning py-1 px-2" role="alert" style={{ fontSize: "13px" }}>
                    Showing the first 500 entries only — this directory has more.
                  </div>
                )}

                <div style={S.fileList}>
                  {isLoading && (
                    <div style={S.empty}>
                      <span className="spinner-border spinner-border-sm me-2" style={{ color: "#500000" }} role="status" aria-hidden="true"></span>
                      Loading&hellip;
                    </div>
                  )}
                  {!isLoading && !browseError && currentPath === "" && (
                    <div style={S.empty}>Select a location above to start browsing.</div>
                  )}
                  {!isLoading && !browseError && currentPath !== "" &&
                    subDirs.length === 0 && (!isShowFiles || subFiles.length === 0) && (
                      <div style={S.empty}>
                        {isShowFiles && allowedExtensions.length > 0
                          ? "No matching files in this directory"
                          : "Empty directory"}
                      </div>
                    )}
                  {!isLoading && subDirs.map((path) => (
                    <div
                      key={path[1]}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open folder ${path[0]}`}
                      style={S.entry(false)}
                      onClick={() => navigateTo(path[1])}
                      onKeyDown={(e) => handleRowKeyDown(e, () => navigateTo(path[1]))}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#fff0f0")}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <i className="fas fa-folder" style={S.entryIcon(true)} aria-hidden="true"></i>
                      <span style={S.entryName(true)} title={path[0]}>{path[0]}</span>
                      <i className="fas fa-chevron-right" style={S.entryChevron} aria-hidden="true"></i>
                    </div>
                  ))}
                  {!isLoading && isShowFiles &&
                    subFiles.map((path) => {
                      const isSelected = path[1] === selectedFilePath;
                      return (
                        <div
                          key={path[1]}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`Select file ${path[0]}`}
                          style={S.entry(isSelected)}
                          onClick={() => selectFile(path[1])}
                          onKeyDown={(e) => handleRowKeyDown(e, () => selectFile(path[1]))}
                          onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#f8f9fa"; }}
                          onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          <i className="fas fa-file" style={S.entryIcon(false)} aria-hidden="true"></i>
                          <span style={S.entryName(false)} title={path[0]}>{path[0]}</span>
                        </div>
                      );
                    })}
                </div>

                {selectedFilePath && (
                  <div style={S.selectedBar}>
                    <i className="fas fa-file" style={{ color: "#500000" }} aria-hidden="true"></i>
                    <span style={S.selectedPath}>{selectedFilePath}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Picker;