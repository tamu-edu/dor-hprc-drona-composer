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
 * @property {number} [refreshInterval] - Auto-refresh interval in seconds
 * @property {boolean} [isHeading=false] - Whether to style the text as a heading with larger, bold font
 * @property {function} [setError] - Function to handle errors during content fetching
 */

import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "../utils/fieldUtils";

function StaticText(props) {
  const [content, setContent] = useState(props.value || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const refreshTimerRef = useRef(null);

  const { values: formValues, updateValue } = useContext(FormValuesContext);
  
  const formValuesRef = useRef(formValues);
  
  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  // Update form context whenever content changes (for conditional logic)
  useEffect(() => {
    if (updateValue && props.name) {
      updateValue(props.name, content);
    }
  }, [content, updateValue, props.name]);

  const relevantFieldNames = useMemo(() => {
    if (!props.retrieverParams) return [];

    return Object.values(props.retrieverParams)
      .filter(value => typeof value === 'string' && value.startsWith('$'))
      .map(value => value.substring(1));
  }, [props.retrieverParams]);

  const createMarkup = (html) => {
    return { __html: html };
  };

  const fetchContent = useCallback(async () => {
    if (!props.isDynamic || !props.retrieverPath) return;

    setIsLoading(true);
    setError(null);
    
    const currentFormValues = formValuesRef.current;

    try {
      const params = new URLSearchParams();
      if (props.retrieverParams && typeof props.retrieverParams === 'object') {
        Object.entries(props.retrieverParams).forEach(([key, value]) => {
          if (typeof value === 'string' && value.startsWith('$')) {
            const fieldName = value.substring(1);
            const fieldValue = getFieldValue(currentFormValues, fieldName);

            if (fieldValue !== undefined) {
              params.append(key, JSON.stringify(fieldValue));
            }
          } else {
            params.append(key, JSON.stringify(value));
          }
        });
      }

      const queryString = params.toString();
      const requestUrl = `${document.dashboard_url}/jobs/composer/evaluate_dynamic_text?retriever_path=${encodeURIComponent(props.retrieverPath)}${queryString ? `&${queryString}` : ''}`;

      const response = await fetch(requestUrl);

      if (!response.ok) {
        const errorData = await response.json();
        props.setError?.({
          message: errorData.message || 'Failed to retrieve select options',
          status_code: response.status,
          details: errorData.details || errorData
        });
        return;
      }

      const data = await response.text();
      setContent(data);
    } catch (err) {
      console.error("Error fetching content:", err);
      setError(err.message || "Failed to load content");
      if (props.setError) {
        props.setError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [props.isDynamic, props.retrieverPath, props.retrieverParams, props.setError]);

  const debouncedFetchContent = useCallback(
    (() => {
      let timeout = null;

      return () => {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
          fetchContent();
          timeout = null;
        }, 300); 
      };
    })(),
    [fetchContent] 
  );

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!props.isDynamic) {
      setContent(props.value || "");
      return;
    }

    fetchContent();

    if (props.refreshInterval && props.refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        debouncedFetchContent();
      }, props.refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [props.isDynamic, props.value, props.retrieverPath, props.refreshInterval, debouncedFetchContent, fetchContent]);

  const prevRelevantValuesRef = useRef({});
  
  useEffect(() => {
    if (!props.isDynamic || !props.retrieverParams || relevantFieldNames.length === 0) {
      return;
    }
    
    let hasRelevantValueChanged = false;
    
    for (const fieldName of relevantFieldNames) {
      const currentValue = getFieldValue(formValues, fieldName);
      const previousValue = prevRelevantValuesRef.current[fieldName];
      
      if (currentValue !== previousValue) {
        hasRelevantValueChanged = true;
        prevRelevantValuesRef.current[fieldName] = currentValue;
      }
    }
    
    if (hasRelevantValueChanged) {
      debouncedFetchContent();
    }
  }, [formValues, props.isDynamic, props.retrieverParams, relevantFieldNames, debouncedFetchContent]);

  const handleRefresh = (e) => {
    e.preventDefault();
    debouncedFetchContent();
  };

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div className="py-2 position-relative">
        {isLoading && (
          <div className="position-absolute" style={{ top: '0', right: '0' }}>
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        )}

        {props.isDynamic && props.showRefreshButton && (
          <button
            onClick={handleRefresh}
            className="btn btn btn-primary maroon-button  btn-sm position-absolute"
            style={{
              right: isLoading ? '30px' : '0',
            }}
            aria-label="Refresh content"
          >
		<span>Refresh</span>
          </button>
        )}

        {props.allowHtml ? (
          <div
            className={`${props.isHeading ? 'text-xl font-bold' : ''}`}
            dangerouslySetInnerHTML={createMarkup(content)}
          />
        ) : (
          <span className={`${props.isHeading ? 'text-xl font-bold' : ''}`}     style={{ whiteSpace: 'pre-line' }}>
            {content}
          </span>
        )}

        {error && (
          <div className="text-danger mt-2" style={{ fontSize: '0.875em' }}>
            Error: {error}
          </div>
        )}
      </div>
    </FormElementWrapper>
  );
}

export default StaticText;
