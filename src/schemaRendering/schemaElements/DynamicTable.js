/**
 * @name DynamicTable
 * @description A table that works like a `dynamicSelect`: its rows come from a retriever script, and
 * clicking a row selects it. The selected value is the row's `value` (with its `label`), so
 * conditions, `$field` references and restored workflows behave exactly as with `dynamicSelect`.
 * Rows can be searched and sorted, which makes it a better fit than a dropdown when each option has
 * several attributes. Like `dynamicSelect` rows are `{ value, label }`, but `label` may be a list with
 * one cell per column, and the retriever may send the column headers along.
 *
 * @example
 * // Retriever output: header names plus rows of { value, label: [one cell per column] }.
 * // The number of columns is whatever the script returns; cells may be strings, numbers, null.
 * {
 *   "columns": ["Name", "State", "Elapsed"],
 *   "rows": [
 *     { "value": "123", "label": ["sim1", "RUNNING", "1:02"] },
 *     { "value": "124", "label": ["sim2", "PENDING", null] }
 *   ]
 * }
 * // Clicking a row sets the field to { value: "123", label: ["sim1", "RUNNING", "1:02"] }
 *
 * @example
 * // Schema: columns entries refine the retrieved headers by position (widths, alignment, ...)
 * {
 *   "type": "dynamicTable",
 *   "name": "job",
 *   "retriever": "retrievers/my_jobs.sh",
 *   "columns": [{ "width": "40%" }, {}, { "align": "right" }],
 *   "maxHeight": "250px"
 * }
 *
 * @example
 * // Legacy form: array of { value, label, ...extra keys }; every key except `value` is a column
 * // retriever output: [{"value":"123","label":"sim1","state":"RUNNING"}]
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} retriever - Path to the script that retrieves the rows
 * @property {Object} [retrieverParams] - Parameters passed to the script as environment variables, values with $ prefix will be replaced with form values
 * @property {Array} [columns] - Header names or objects `{ title?, align?: "left"|"right", sortable?: boolean (default true), width?, html?: boolean }`. When the retriever returns `columns` these refine them by position; otherwise they define the columns (legacy form: objects with `key` read that row key).
 * @property {Object} [value] - Default/initial selected row (object with value and label)
 * @property {Array} [options] - Initial rows, may be overridden by retriever
 * @property {boolean} [searchable=true] - Show a search box that filters rows across all columns
 * @property {string} [searchPlaceholder] - Placeholder text for the search box
 * @property {string} [maxHeight="300px"] - Height at which the table body starts scrolling
 * @property {string|Object|Array} [layout] - Optional frame: "card" (rounded card with a title pill and green dot) or "boxed", e.g. { "preset": "card", "title": "Workflows" }; a CSS object applies to the content area. The title may reference form fields as `$fieldName`. Unset renders no frame.
 * @property {boolean} [useLabel=true] - false hides the label row (handy with `layout`, which has its own title)
 * @property {boolean} [showRefreshButton=false] - Show a button next to the search box that re-fetches the rows
 * @property {boolean} [collapseOnSelect=false] - After the user clicks a row, fold the table into a one-line summary of the selected row with a "Expand" button that brings the table back. Restored values do not collapse the table.
 * @property {boolean} [pagination=false] - Use pages instead of scrolling
 * @property {string} [emptyMessage="No options available"] - Text shown when there are no rows
 * @property {string} [help] - Help text displayed below the table
 * @property {number} [refreshInterval] - Re-fetch the rows every this many seconds. Omit/0 to
 * fetch only when shown and when a `$field` in `retrieverParams` changes. Paused while the browser
 * tab is hidden; a failed poll keeps the current rows.
 * @property {string} [refreshWhile] - Condition (same syntax as `condition`); polling only runs while
 * it is true, with one final fetch when it turns false
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import DataTable from "react-data-table-component";
import FormElementWrapper from "../utils/FormElementWrapper";
import LayoutFrame from "../utils/LayoutFrame";
import { resolveLayout } from "../utils/choiceStyles";
import { useRetriever, usePolling } from "../hooks";
import { compactTableStyles } from "../../tablestyle.jsx";

const FRAME_PRESETS = ["boxed", "card"];

const toOption = (row) => ({ value: row.value, label: row.label ?? String(row.value) });

// `label` is either a string or a list with one entry per column (entries may be strings,
// numbers, booleans or null)
const labelText = (label) => (Array.isArray(label) ? label.join(" \u00b7 ") : String(label ?? ""));

const asDef = (column) => (typeof column === "string" ? { title: column } : column || {});

const compareCells = (a, b) =>
  typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true });

// Click events only reach the row when the clicked element is tagged like this
const ROW_EVENTS = { "data-tag": "allowRowEvents" };

function DynamicTable(props) {
  const [value, setValue] = useState(props.value || "");
  const [search, setSearch] = useState("");
  // With `collapseOnSelect` the table folds into a summary bar after the user clicks a row
  const [collapsed, setCollapsed] = useState(false);
  const changeButtonRef = useRef(null);
  const searchRef = useRef(null);
  const focusAfterToggle = useRef(null);

  const resolvedLayout = useMemo(() => resolveLayout(props.layout, { only: FRAME_PRESETS }), [props.layout]);

  const retrieverPath = props.retrieverPath || props.retriever;
  const searchable = props.searchable !== false;

  const { data, isLoading, isRefreshing, isEvaluated, refetch } = useRetriever({
    retrieverPath,
    retrieverParams: props.retrieverParams,
    initialData: props.options || [],
    parseJSON: true,
    isShown: props.isShown,
    onError: props.setError,
  });

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  useEffect(() => {
    if (props.isShown && retrieverPath == undefined) {
      props.setError({
        message: "Retriever path is not set",
        status_code: 400,
        details: ""
      });
    }
  }, [props.isShown, retrieverPath]); // eslint-disable-line react-hooks/exhaustive-deps

  usePolling(() => refetch({ background: true }), props.refreshInterval, {
    enabled: !!retrieverPath,
    refreshWhile: props.refreshWhile,
  });

  // Reload the rows when something else changed the underlying data (e.g. a deleted workflow)
  useEffect(() => {
    const reload = () => refetch({ background: true });
    window.addEventListener("drona-refresh-options", reload);
    return () => window.removeEventListener("drona-refresh-options", reload);
  }, [refetch]);

  const showLoading = isLoading && !isRefreshing;

  // The retriever returns either an array of rows, or { columns: [...], rows: [...] }.
  // A row is { value, label }: `value` is what the field gets when the row is clicked and `label`
  // is the list of cell values, one per column. `columns` holds the header names (or objects
  // { title, align, width, sortable, html }), so the script decides how many columns there are.
  // A plain string `label` with extra keys on the row (legacy form) still works.
  const rows = useMemo(() => {
    const list = Array.isArray(data) ? data : data?.rows;
    return Array.isArray(list) ? list : [];
  }, [data]);
  const retrievedColumns = !Array.isArray(data) && Array.isArray(data?.columns) ? data.columns : null;

  // A selected value that is no longer among the rows is flagged, like dynamicSelect
  const isValueInvalid = !!(
    isEvaluated && value && !rows.some(row => row.value === value.value)
  );

  const columns = useMemo(() => {
    let defs;
    if (retrievedColumns && retrievedColumns.length) {
      // schema `columns` entries refine the retrieved ones by position (e.g. widths)
      defs = retrievedColumns.map((col, i) => ({ ...asDef(col), ...asDef((props.columns || [])[i]) }));
    } else if (props.columns && props.columns.length) {
      defs = props.columns.map(asDef);
    } else if (rows.some(row => Array.isArray(row.label))) {
      const count = Math.max(...rows.map(row => (Array.isArray(row.label) ? row.label.length : 1)));
      defs = Array.from({ length: count }, () => ({}));
    } else {
      defs = Object.keys(rows[0] || {}).filter(key => key !== "value").map(key => ({ key }));
    }
    return defs.map((def, i) => {
      const getCell = (row) => {
        if (def.key !== undefined) return row[def.key];
        return Array.isArray(row.label) ? row.label[i] : (i === 0 ? row.label : undefined);
      };
      return {
        name: def.title ?? def.key ?? "",
        selector: getCell,
        sortable: def.sortable !== false,
        sortFunction: (a, b) => compareCells(getCell(a), getCell(b)),
        right: def.align === "right",
        width: def.width,
        cell: def.html
          ? row => <span {...ROW_EVENTS} dangerouslySetInnerHTML={{ __html: getCell(row) ?? "" }} />
          : row => {
              const text = String(getCell(row) ?? "");
              return <div {...ROW_EVENTS} className="text-truncate" title={text}>{text}</div>;
            },
        getCell,
      };
    });
  }, [props.columns, retrievedColumns, rows]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row =>
      columns.some(col => String(col.getCell(row) ?? "").toLowerCase().includes(term))
    );
  }, [rows, columns, search]);

  const handleRowClicked = (row) => {
    const option = toOption(row);
    setValue(option);
    if (props.onChange) {
      props.onChange(props.index, option);
    }
    if (props.collapseOnSelect) {
      focusAfterToggle.current = "change";
      setCollapsed(true);
    }
  };

  const expand = () => {
    focusAfterToggle.current = "search";
    setCollapsed(false);
  };

  // Keep keyboard focus on something sensible when the table folds or unfolds
  useEffect(() => {
    if (focusAfterToggle.current === "change") changeButtonRef.current?.focus();
    if (focusAfterToggle.current === "search") searchRef.current?.focus();
    focusAfterToggle.current = null;
  }, [collapsed]);

  const showSummary = collapsed && !!value && !isValueInvalid;

  const conditionalRowStyles = [
    {
      when: row => !!value && row.value === value.value,
      style: { backgroundColor: "#e7f1ff", fontWeight: 600, borderLeft: "3px solid #500000" },
    },
  ];

  const emptyMessage = showLoading
    ? "Loading options..."
    : rows.length > 0
      ? "No rows match the search"
      : props.emptyMessage || "No options available";

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
      useLabel={props.useLabel}
    >
      <LayoutFrame resolved={resolvedLayout}>
      <div style={{ width: "100%" }}>
        {showSummary && (
          <div
            className="d-flex align-items-center"
            style={{
              gap: "0.75rem",
              padding: "0.5rem 0.75rem",
              border: "1px solid #dee2e6",
              borderLeft: "3px solid #500000",
              borderRadius: "4px",
              backgroundColor: "#e7f1ff",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <span className="text-truncate flex-grow-1" title={labelText(value.label)} style={{ fontWeight: 600 }}>
              {labelText(value.label)}
            </span>
            <button
              type="button"
              ref={changeButtonRef}
              className="btn btn-sm btn-primary maroon-button"
              onClick={expand}
            >
              Expand
            </button>
          </div>
        )}
        {!showSummary && (searchable || props.showRefreshButton) && (
          <div className="d-flex align-items-center mb-2" style={{ gap: "0.5rem" }}>
            {searchable && (
            <input
              ref={searchRef}
              type="search"
              className="form-control form-control-sm"
              placeholder={props.searchPlaceholder || "Search..."}
              aria-label="Search table"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            )}
            {props.showRefreshButton && (
              <button
                type="button"
                className="btn btn-sm btn-primary maroon-button"
                style={{ marginLeft: "auto" }}
                onClick={() => refetch()}
                aria-label="Refresh table"
                title="Refresh"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            )}
          </div>
        )}
        {!showSummary && <div
          style={{
            border: isValueInvalid ? "1px solid #dc3545" : "1px solid #dee2e6",
            borderRadius: "4px",
            overflow: "hidden",
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <DataTable
            columns={columns}
            data={visibleRows}
            customStyles={compactTableStyles}
            conditionalRowStyles={conditionalRowStyles}
            onRowClicked={handleRowClicked}
            highlightOnHover
            sortIcon={
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ marginLeft: "4px" }}>
                <path d="M6 9L2 5h8L6 9z" />
              </svg>
            }
            fixedHeader={!props.pagination}
            fixedHeaderScrollHeight={props.maxHeight || "300px"}
            pagination={!!props.pagination}
            progressPending={showLoading}
            noDataComponent={<div className="p-3 text-muted">{emptyMessage}</div>}
          />
        </div>}
        <input type="hidden" name={props.name} value={value?.value || ""} readOnly />
        <input type="hidden" name={`${props.name}_label`} value={labelText(value?.label)} />
        {isValueInvalid && (
          <div className="text-danger" style={{ fontSize: "0.875em", marginTop: "0.25rem" }}>
            The selected option ({labelText(value.label)}) may no longer be available
          </div>
        )}
      </div>
      </LayoutFrame>
    </FormElementWrapper>
  );
}

export default DynamicTable;
