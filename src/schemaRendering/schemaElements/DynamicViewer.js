/**
 * @name DynamicViewer
 * @description A sandboxed iframe-based viewer component that can load external CDN libraries
 * and execute custom initialization code. Supports dynamic data fetching via retriever scripts.
 *
 * @example
 * // Static data viewer
 * {
 *   "type": "dynamicViewer",
 *   "name": "proteinViewer",
 *   "value": {
 *     "title": "Protein Viewer",
 *     "cdnLibraries": ["https://3dmol.csb.pitt.edu/build/3Dmol-min.js"],
 *     "initCode": "// Use data variable",
 *     "data": { "pdbId": "1CRN" }
 *   }
 * }
 *
 * @example
 * // Dynamic data viewer with retriever
 * {
 *   "type": "dynamicViewer",
 *   "name": "proteinViewer",
 *   "retriever": "retrievers/fetch_protein.sh",
 *   "retrieverParams": { "proteinId": "$selectedProtein" },
 *   "value": {
 *     "title": "Protein Viewer",
 *     "cdnLibraries": ["https://3dmol.csb.pitt.edu/build/3Dmol-min.js"],
 *     "initCode": "// data variable contains fetched result"
 *   }
 * }
 *
 * @property {string} name - Component name for form submission
 * @property {string} [retriever] - Path to retriever script for dynamic data
 * @property {string} [retrieverPath] - Alias for retriever
 * @property {Object} [retrieverParams] - Parameters with $fieldName references for dynamic values
 * @property {Object} value - Viewer configuration object
 * @property {string} [value.title] - Title displayed in card header
 * @property {string} [value.description] - Description shown under title
 * @property {string|string[]} [value.cdnLibraries] - CDN URLs to load (must be from approved sources)
 * @property {string} [value.initCode] - JavaScript code to execute in iframe, or a path to a .js file (e.g. "viewers/myViewer.js") whose content will be fetched and used
 * @property {Object} [value.data] - Static data passed to initCode (overridden by retriever)
 * @property {string} [value.height="600px"] - Iframe height
 * @property {string} [value.footer] - Footer text
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { useRetriever } from "../hooks";
import { fetchFileContent } from "../utils/utils";
import { FormValuesContext } from "../FormValuesContext";

const SECURITY_CONFIG = {
  MAX_MEMORY_MB: 150,
  MAX_CONSOLE_CALLS: 2000,

  APPROVED_SOURCES: [
    'cdn.jsdelivr.net',
    'unpkg.com',
    'cdnjs.cloudflare.com',
    '3dmol.csb.pitt.edu',
    'cdn.plot.ly',
    'files.rcsb.org',
    'd3js.org',
    'alphafold.ebi.ac.uk',
    'pubchem.ncbi.nlm.nih.gov',
    'rest.uniprot.org',
    'www.rcsb.org',
    'www.ebi.ac.uk',
  ],
};

// Validate CDN libraries before component mounts
function validateCDNs(cdnLibraries) {
  let libs = cdnLibraries || [];
  if (!Array.isArray(libs)) libs = [libs];

  if (libs.length === 0) return { valid: [], blocked: [] };

  const validLibs = [];
  const blockedLibs = [];

  libs.forEach(url => {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:') {
        blockedLibs.push({ url, reason: 'Non-HTTPS protocol not allowed' });
        return;
      }

      const isApproved = SECURITY_CONFIG.APPROVED_SOURCES.some(d =>
        u.hostname === d || u.hostname.endsWith('.' + d)
      );

      if (!isApproved) {
        blockedLibs.push({ url, reason: 'CDN domain not in approved list' });
        return;
      }

      validLibs.push(url);
    } catch (e) {
      blockedLibs.push({ url, reason: 'Invalid URL format' });
    }
  });

  return { valid: validLibs, blocked: blockedLibs };
}

function isInitCodeFilePath(str) {
  return typeof str === 'string' && !str.includes('\n') && str.trim().endsWith('.js');
}

function DynamicViewer(props) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [securityBlock, setSecurityBlock] = useState(null);
  const [resolvedInitCode, setResolvedInitCode] = useState(null);
  const iframeRef = useRef(null);
  const initializedRef = useRef(false);
  const prevDataRef = useRef(null);

  const { environment } = useContext(FormValuesContext);

  // Parse static config from props.value
  const staticConfig = useMemo(() => {
    if (!props.value) return {};
    return typeof props.value === 'string' ? JSON.parse(props.value) : props.value;
  }, [props.value]);

  // Get retriever config from props (can be at top level or inside value)
  const retrieverPath = props.retrieverPath || props.retriever || staticConfig.retriever;

  // Memoize retrieverParams to avoid creating new object on every render
  const retrieverParams = useMemo(() => {
    return props.retrieverParams || staticConfig.retrieverParams || null;
  }, [props.retrieverParams, staticConfig.retrieverParams]);

  // Use retriever hook for dynamic data fetching
  const {
    data: dynamicData,
    isLoading: isRetrieverLoading,
    isEvaluated: isRetrieverEvaluated,
    error: retrieverError,
  } = useRetriever({
    retrieverPath,
    retrieverParams,
    initialData: null,
    parseJSON: true,
    isShown: props.isShown !== false,
    fetchOnMount: !!retrieverPath,
    onError: props.setError,
  });

  // Merge static config with dynamic data
  const config = useMemo(() => {
    if (!retrieverPath) {
      // No retriever - use static config as-is
      return staticConfig;
    }

    if (!isRetrieverEvaluated || isRetrieverLoading) {
      // Still loading - use static config but mark as loading
      return staticConfig;
    }

    // Merge dynamic data into config
    return {
      ...staticConfig,
      data: dynamicData !== null ? dynamicData : (staticConfig.data || {}),
    };
  }, [staticConfig, retrieverPath, dynamicData, isRetrieverEvaluated, isRetrieverLoading]);

  // Fetch initCode from file if initCode is a .js file path
  const rawInitCode = config.initCode;
  const initCodeIsFilePath = isInitCodeFilePath(rawInitCode);

  useEffect(() => {
    if (!initCodeIsFilePath) {
      setResolvedInitCode(rawInitCode || null);
      return;
    }

    let cancelled = false;

    fetchFileContent({ filePath: rawInitCode, environment })
      .then(content => {
        if (!cancelled) setResolvedInitCode(content);
      })
      .catch(err => {
        if (!cancelled) {
          setError(`Failed to load init code from "${rawInitCode}": ${err.message}`);
          setStatus('error');
        }
      });

    return () => { cancelled = true; };
  }, [rawInitCode, initCodeIsFilePath, environment]);

  // While a file path is being resolved, treat initCode as pending
  const initCodeReady = !initCodeIsFilePath || resolvedInitCode !== null;
  const effectiveInitCode = initCodeIsFilePath ? resolvedInitCode : rawInitCode;

  // Build the effective config with the resolved initCode
  const effectiveConfig = useMemo(() => {
    if (effectiveInitCode === rawInitCode) return config;
    return { ...config, initCode: effectiveInitCode };
  }, [config, effectiveInitCode, rawInitCode]);

  // Validate CDNs immediately
  const cdnValidation = validateCDNs(effectiveConfig.cdnLibraries);
  const hasBlockedCDNs = cdnValidation.blocked.length > 0;

  useEffect(() => {
    // If CDNs were blocked, set blocked status immediately
    if (hasBlockedCDNs) {
      const reasons = cdnValidation.blocked.map(b => `${b.url}\n  → ${b.reason}`).join('\n\n');
      setSecurityBlock(`The following CDN libraries were blocked for security:\n\n${reasons}`);
      setStatus('blocked');
      return;
    }

    const handleMessage = (event) => {
      if (event.origin !== 'null' && event.origin !== window.location.origin) return;

      if (event.data.type === 'viewer-ready') {
        setStatus('ready');
      } else if (event.data.type === 'viewer-error') {
        setError(event.data.message);
        setStatus('error');
      } else if (event.data.type === 'security-block') {
        setSecurityBlock(event.data.reason);
        setStatus('blocked');
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [hasBlockedCDNs, cdnValidation.blocked]);

  // Determine if we should show loading state (either retriever loading or iframe loading)
  const showRetrieverLoading = (retrieverPath && isRetrieverLoading) || (initCodeIsFilePath && !initCodeReady);

  // Use ref to store current config for use in callbacks without causing re-renders
  const configRef = useRef(effectiveConfig);
  const cdnValidationRef = useRef(cdnValidation);

  useEffect(() => {
    configRef.current = effectiveConfig;
    cdnValidationRef.current = cdnValidation;
  }, [effectiveConfig, cdnValidation]);

  // Stable initViewer function that reads from refs
  const initViewer = useCallback(() => {
    if (!iframeRef.current) return;

    setStatus('loading');
    const html = generateHTML(configRef.current, cdnValidationRef.current.valid);
    if (!html) {
      setError('Failed to generate viewer HTML');
      setStatus('error');
      return;
    }

    iframeRef.current.srcdoc = html;
  }, []); // No dependencies - uses refs

  const setIframeRef = useCallback((node) => {
    if (node && !hasBlockedCDNs) {
      iframeRef.current = node;
    }
  }, [hasBlockedCDNs]);

  // Initialize iframe when ready (no retriever, or retriever finished; and initCode resolved)
  useEffect(() => {
    if (!iframeRef.current || hasBlockedCDNs || initializedRef.current) return;

    const shouldInit = (!retrieverPath || isRetrieverEvaluated) && initCodeReady;
    if (shouldInit) {
      initializedRef.current = true;
      setTimeout(() => initViewer(), 50);
    }
  }, [retrieverPath, isRetrieverEvaluated, hasBlockedCDNs, initCodeReady, initViewer]);

  // Re-initialize iframe when dynamic data changes
  useEffect(() => {
    if (!retrieverPath || !iframeRef.current || hasBlockedCDNs) return;

    // Only re-initialize if data has actually changed
    const currentDataString = JSON.stringify(effectiveConfig.data);
    if (prevDataRef.current !== null && prevDataRef.current !== currentDataString) {
      // Data changed - re-initialize the viewer
      setStatus('loading');
      initViewer();
    }
    prevDataRef.current = currentDataString;
  }, [effectiveConfig.data, retrieverPath, hasBlockedCDNs, initViewer]);

  const generateHTML = (cfg, validLibs) => {
    const origins = [...new Set(validLibs.map(u => new URL(u).origin))].join(' ');
    const dataOrigins = SECURITY_CONFIG.APPROVED_SOURCES.map(d => `https://${d}`).join(' ');

    // Content Security Policy
    const csp = [
      "default-src 'none'",
      validLibs.length > 0 ? `script-src ${origins} 'unsafe-inline' 'unsafe-eval'` : "script-src 'unsafe-inline'",
      "style-src 'unsafe-inline'",
      `connect-src data: blob: ${dataOrigins}`,
      `img-src data: blob: ${dataOrigins}`,
    ].join('; ');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <style>
    body { margin: 0; padding: 0; width: 100%; height: 100vh; overflow: hidden; }
    #viewer-container { width: 100%; height: 100%; }
    .security-block {
      color: #721c24;
      background: #f8d7da;
      border: 2px solid #f5c6cb;
      border-radius: 4px;
      padding: 20px;
      margin: 20px;
    }
  </style>
</head>
<body>
  <div id="viewer-container"></div>
  ${validLibs.map(u => `<script src="${u}"></script>`).join('\n  ')}
  <script>
    (function() {
      'use strict';
      const LIMITS = {
        maxConsole: ${SECURITY_CONFIG.MAX_CONSOLE_CALLS},
        maxMemMB: ${SECURITY_CONFIG.MAX_MEMORY_MB},
      };

      const state = { consoleCount: 0 };

      // Console rate limiting
      ['log','warn','error','info','debug'].forEach(m => {
        const orig = console[m];
        console[m] = function(...args) {
          state.consoleCount++;
          if (state.consoleCount === LIMITS.maxConsole + 1) {
            console.warn('Console rate limit reached (' + LIMITS.maxConsole + ' calls)');
          }
          if (state.consoleCount > LIMITS.maxConsole) return;
          orig.apply(console, args);
        };
      });

      // Memory monitoring
      let memoryWarningShown = false;
      setInterval(() => {
        if (performance.memory && !memoryWarningShown) {
          const mb = performance.memory.usedJSHeapSize / 1048576;
          if (mb > LIMITS.maxMemMB) {
            memoryWarningShown = true;
            console.warn('High memory usage: ' + mb.toFixed(0) + 'MB');
          }
        }
      }, 5000);

      const container = document.getElementById('viewer-container');
      const data = ${JSON.stringify(cfg.data || {})};
      const instanceRef = { current: null };

      // Basic error handling
      window.addEventListener('error', e => {
        const msg = e.message || 'Unknown error';
        if (!msg.includes('Script error')) {
          window.parent.postMessage({ type: 'viewer-error', message: msg }, '*');
        }
      });

      window.addEventListener('unhandledrejection', e => {
        const reason = e.reason?.message || String(e.reason);
        window.parent.postMessage({ type: 'viewer-error', message: reason }, '*');
      });

      (async function() {
        try {
          if (document.readyState === 'loading') {
            await new Promise(r => document.addEventListener('DOMContentLoaded', r));
          }
          await new Promise(r => setTimeout(r, 200));

          // Helper function for long-running operations to yield control
          window.yieldControl = async () => {
            await new Promise(r => setTimeout(r, 0));
          };

          ${cfg.initCode || 'console.log("No init code")'}

          window.parent.postMessage({ type: 'viewer-ready' }, '*');
        } catch (err) {
          const msg = err.message || 'Unknown error';
          container.innerHTML = '<div class="security-block"><strong>Error</strong><p>' + msg + '</p></div>';
          window.parent.postMessage({ type: 'viewer-error', message: err.message }, '*');
        }
      })();
    })();
  </script>
</body>
</html>`;
  };

  return (
    <FormElementWrapper {...props}>
      <div className="card">
        {effectiveConfig.title && (
          <div className="card-header bg-light">
            <h5 className="mb-0">{effectiveConfig.title}</h5>
            {effectiveConfig.description && <small className="text-muted d-block mt-1">{effectiveConfig.description}</small>}
          </div>
        )}

        <div className="card-body p-0" style={{ position: 'relative' }}>
          {(status === 'loading' || showRetrieverLoading) && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'white', zIndex: 10
            }}>
              <div className="spinner-border text-primary" role="status">
              </div>
            </div>
          )}

          {status === 'blocked' && (
            <div className="alert alert-warning m-3" role="alert">
              <h5 className="alert-heading">
                <i className="bi bi-shield-exclamation"></i> Security Block
              </h5>
              <hr />
              <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9em' }}>
                {securityBlock}
              </pre>
            </div>
          )}

          {status === 'error' && (
            <div className="alert alert-danger m-3">
              <strong>Error:</strong> {error}
            </div>
          )}

          {retrieverError && !isRetrieverLoading && (
            <div className="alert alert-danger m-3">
              <strong>Data Loading Error:</strong> {retrieverError.message || 'Failed to load data'}
            </div>
          )}

          {!hasBlockedCDNs && (!retrieverPath || isRetrieverEvaluated) && initCodeReady && (
            <iframe
              ref={setIframeRef}
              sandbox="allow-scripts"
              style={{
                width: "100%",
                height: effectiveConfig.height || "600px",
                border: "none",
                display: "block",
              }}
              title={effectiveConfig.title || "Dynamic Viewer"}
            />
          )}
        </div>

        {effectiveConfig.footer && (
          <div className="card-footer text-muted small">{effectiveConfig.footer}</div>
        )}

        <div className="card-footer bg-light border-top">
          <small className="text-muted d-flex align-items-center">
            <i className="bi bi-shield-check text-success me-2"></i>
	      <span>
      <strong>Warning:</strong> Do not enter passwords, credentials, or sensitive information here.</span>
          </small>
        </div>
      </div>
    </FormElementWrapper>
  );
}

export default DynamicViewer;
