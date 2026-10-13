/**
 * @name StaticText
 * @description Displays static or dynamically fetched text content. Can show plain text or HTML content
 * with options for dynamic content retrieval using script files, auto-refreshing, and manual refresh controls.
 *
 * @example
 * // Basic static text
 * {
 *   "type": "staticText",
 *   "name": "infoText",
 *   "label": "Information",
 *   "value": "This is some static text",
 *   "help": "Simple static text display"
 * }
 *
 * @example
 * // Dynamic text that fetches from a script retriever
 * {
 *   "type": "staticText",
 *   "name": "dynamicContent",
 *   "label": "Script Output",
 *   "isDynamic": true,
 *   "retriever": "retrievers/text_retriever.sh",
 *   "retrieverParams": { "id": "$userId" },
 *   "showRefreshButton": true
 * }
 *
 * @example
 * // Dynamic HTML content with auto-refresh
 * {
 *   "type": "staticText",
 *   "name": "liveHtmlContent",
 *   "label": "Server Status",
 *   "isDynamic": true,
 *   "retriever": "retrievers/server_status.sh",
 *   "allowHtml": true,
 *   "refreshInterval": 30
 * }
 *
 *
 * @property {string} name - Input field name
 * @property {string} [label] - Display label for the field
 * @property {boolean} [labelOnTop=false] - Whether to display label above the content
 * @property {string} [help] - Help text displayed below the content
 * @property {string} [value] - Static text content (used when isDynamic is false)
 * @property {boolean} [isDynamic=false] - Whether content should be fetched from a script retriever
 * @property {string} [retriever] - Path to the script file that will generate dynamic content
 * @property {Object} [retrieverParams] - Parameters passed to the script as environment variables, values with $ prefix will be replaced with form values
 * @property {boolean} [allowHtml=false] - Whether to render content as HTML using dangerouslySetInnerHTML
 * @property {boolean} [showRefreshButton=false] - Whether to show a manual refresh button for dynamic content
 * @property {number} [refreshInterval] - Auto-refresh interval in seconds. Paused while the browser
 * tab is hidden; a poll is skipped if the previous one is still running. A failed poll keeps the
 * previous content with an inline "Refresh failed" note, and only raises the global error after
 * several failures in a row.
 * @property {string} [refreshWhile] - Condition (same syntax as `condition`); auto-refresh only runs
 * while it is true, with one final refresh when it turns false, e.g. "!drona_status.DONE"
 * @property {boolean} [isHeading=false] - Whether to style the text as a heading with larger, bold font
 * @property {string|Object|Array} [layout] - Optional frame: "card" (rounded card with a title pill and green dot) or "boxed", e.g. { "preset": "card", "title": "Job Efficiency" }; a CSS object applies to the content area. The title may reference form fields as `$fieldName`, e.g. "Resource Usage · Job $jobs". Unset renders no frame.
 * @property {boolean} [layout.collapsible] - Card layouts only: the title pill toggles the content (chevron before the title)
 * @property {boolean} [layout.collapsed] - Card layouts only: initial state folded (implies collapsible); the retriever and
 * polling are held back while folded, e.g. { "preset": "card", "title": "Job Logs", "collapsible": true, "collapsed": true }
 * @property {function} [setError] - Function to handle errors during content fetching
 */

import React, { useState, useEffect, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import { CollapsedProvider, CollapsedContext } from "../CollapsedContext";
import FormElementWrapper from "../utils/FormElementWrapper";
import LayoutFrame from "../utils/LayoutFrame";
import { resolveLayout } from "../utils/choiceStyles";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "../utils/fieldUtils";
import { useRetriever, usePolling } from "../hooks";
import { RefreshFailedNotice } from "../utils/retrieverFailures";

const FRAME_PRESETS = ["boxed", "card"];

// Outer shell: label wrapper and frame. With a collapsible card the title pill toggles the content, and
// CollapsedProvider holds back the retriever and polling (StaticTextContent) while it is collapsed.
function StaticText(props) {
  const resolved = useMemo(() => resolveLayout(props.layout, { only: FRAME_PRESETS }), [props.layout]);
  const [isCollapsed, setIsCollapsed] = useState(resolved.collapsed);
  // Card frames get a slot on the top border for the refresh button; other frames keep it in the content
  const [actionTarget, setActionTarget] = useState(null);
  const collapse = resolved.collapsible && resolved.frame
    ? {
        isCollapsed,
        onToggle: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsCollapsed((prev) => !prev);
        },
      }
    : undefined;

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
      useLabel={props.useLabel}
    >
      <LayoutFrame resolved={resolved} collapse={collapse} actionRef={resolved.frame ? setActionTarget : undefined}>
        <CollapsedProvider collapsed={!!collapse && isCollapsed}>
          <StaticTextContent {...props} actionTarget={resolved.frame ? actionTarget : null} />
        </CollapsedProvider>
      </LayoutFrame>
    </FormElementWrapper>
  );
}

function StaticTextContent(props) {
  const [staticContent, setStaticContent] = useState(props.value || "");

  const { values: formValues, updateValue } = useContext(FormValuesContext);
  const isCollapsed = useContext(CollapsedContext);

  const retrieverPath = props.isDynamic ? props.retrieverPath : undefined;

  const { data, isLoading, isRefreshing, error, refreshError, lastSuccessAt, refetch } = useRetriever({
    retrieverPath,
    retrieverParams: props.retrieverParams,
    initialData: props.value || "",
    parseJSON: false,
    // No global alert: a failed fetch is shown as a muted note below
  });

  const content = props.isDynamic ? data : staticContent;

  // Background polls update the content quietly; only other fetches show the spinner
  const showLoading = isLoading && !isRefreshing;

  // Update form context whenever content changes (for conditional logic)
  useEffect(() => {
    const currentContextValue = getFieldValue(formValues, props.name);

    if (updateValue && props.name && currentContextValue != content) {
      updateValue(props.name, content);
    }
  }, [content, updateValue, props.name, formValues]);

  const createMarkup = (html) => {
    return { __html: html };
  };

  // Handle static content value changes
  useEffect(() => {
    if (!props.isDynamic) {
      setStaticContent(props.value || "");
    }
  }, [props.isDynamic, props.value]);

  usePolling(() => refetch({ background: true }), props.refreshInterval, {
    enabled: !!retrieverPath,
    refreshWhile: props.refreshWhile,
  });

  const handleRefresh = (e) => {
    e.preventDefault();
    refetch();
  };

  // In the content (top-right, over the text) or, with a card frame, on the top border at the right corner
  const refreshButton = (onBorder) => (
    <button
      onClick={handleRefresh}
      className={`btn btn-primary maroon-button btn-sm${onBorder ? "" : " position-absolute"}`}
      style={
        onBorder
          ? { padding: "2px 12px", lineHeight: 1.2, borderRadius: "999px" }
          : {
              right: showLoading ? '30px' : '0',
              // Retrieved HTML (rendered below via dangerouslySetInnerHTML)
              // often uses position:relative internally (e.g. for a
              // floating title badge), which puts it in this same
              // stacking layer and, being later in the DOM, would
              // otherwise paint its background over this button.
              zIndex: 10,
            }
      }
      aria-label="Refresh content"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  );

  return (
      <div className="py-2 position-relative">
        {props.isDynamic && props.showRefreshButton && props.actionTarget && !isCollapsed &&
          createPortal(refreshButton(true), props.actionTarget)}
        {showLoading && (
          <div className="position-absolute" style={{ top: '0', right: '0', zIndex: 10 }}>
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        )}

        {props.isDynamic && props.showRefreshButton && !props.actionTarget && refreshButton(false)}

        {props.allowHtml ? (
          <div
            className={`${props.isHeading ? 'text-xl font-bold' : ''}`}
            dangerouslySetInnerHTML={createMarkup(content)}
          />
        ) : (
          <span className={`${props.isHeading ? 'text-xl font-bold' : ''}`} style={{ whiteSpace: 'pre-line' }}>
            {content}
          </span>
        )}

        {error && (
          <div
            className="text-muted mt-2"
            style={{ fontSize: '0.875em' }}
            title={[error.status_code ? `HTTP ${error.status_code}` : null, error.message].filter(Boolean).join(': ')}
            role="status"
          >
            {error.status_code === 504 ? "Timed out loading this content" : "Unable to load this content"}
          </div>
        )}

        <RefreshFailedNotice error={refreshError} lastSuccessAt={lastSuccessAt} />
      </div>
  );
}

export default StaticText;
