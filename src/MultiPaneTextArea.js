// MultiPaneTextArea.jsx - Clean Rewrite with Integration Support
import React, { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';

import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { StreamLanguage, indentUnit } from '@codemirror/language';

import { eclipse } from '@uiw/codemirror-theme-eclipse';

import {standaloneStyles, integratedStyles, commonStyles} from "./styles/MultiPaneTextAreaStyles"

// Static language extensions - created once at module load, never recreated per render/keystroke.
const PYTHON_EXTENSION = [python()];
const MARKDOWN_EXTENSION = [markdown()];
const JSON_EXTENSION = [json()];
const SHELL_EXTENSION = [StreamLanguage.define(shell)];

const isPythonFile = (name) => {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  return lowerName.endsWith('.py') || lowerName.includes('python');
};

const getLanguageExtension = (name) => {
  if (!name) return SHELL_EXTENSION;

  const lowerName = name.toLowerCase();

  if (isPythonFile(name)) {
    return PYTHON_EXTENSION;
  } else if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
    return MARKDOWN_EXTENSION;
  } else if (lowerName.endsWith('.json')) {
    return JSON_EXTENSION;
  } else {
    return SHELL_EXTENSION;
  }
};

// PEP 8 wants 4-space indent for Python; keep bash/json/markdown at 2 spaces.
const PYTHON_INDENT_UNIT = indentUnit.of('    ');
const DEFAULT_INDENT_UNIT = indentUnit.of('  ');
const getIndentUnitExtension = (name) => isPythonFile(name) ? PYTHON_INDENT_UNIT : DEFAULT_INDENT_UNIT;

// CodeMirror 6 deliberately leaves Tab unbound by default (so it can move focus instead of
// getting trapped); wire it to indent/dedent explicitly.
const INDENT_WITH_TAB_KEYMAP = keymap.of([indentWithTab]);

// Static CodeMirror theme/config - must keep a stable identity across renders, otherwise
// @uiw/react-codemirror reconfigures (and rebuilds autocompletion/history) on every render.
const EDITOR_THEME_EXTENSION = EditorView.theme({
  "&": {
    caretColor: "#500000"
  },
  ".cm-cursor": {
    borderLeftColor: "#500000 !important",
    borderLeftWidth: "2px"
  },
  ".cm-focused": {
    outline: "2px solid rgba(80, 0, 0, 0.2)"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(80, 0, 0, 0.08)"
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(80, 0, 0, 0.03)"
  },
  ".cm-editor": {
    fontSize: "13px"
  },
  ".cm-gutters": {
    backgroundColor: "#f8f9fa",
    borderRight: "1px solid #dee2e6"
  }
});

// Note: indent width is set per-language via getIndentUnitExtension() in editorExtensions
// below, not here - basicSetup's own `tabSize` option would inject a second, conflicting
// indentUnit extension.
const BASIC_SETUP_CONFIG = {
  lineNumbers: true,
  highlightActiveLine: false,
  foldGutter: true,
  indentOnInput: true,
  searchKeymap: true,
  autocompletion: true,
  bracketMatching: true,
  syntaxHighlighting: true,
};

const MultiPaneTextArea = forwardRef(({
  panes, 
  setPanes, 
  isDisplayed, 
  activePane: propActivePane, 
  integrated = false 
}, ref) => {
  const [activePane, setActivePane] = useState(0);
  const editorRefs = useRef({});
  const contentUpdateTimeoutsRef = useRef({});

  // Process and sort panes
  const getSortedPanes = () => {
    if (!panes || !Array.isArray(panes)) return [];
    
    let zeroOrderIndex = 10000;
    return [...panes]
      .map((pane, index) => {
        if (pane.order === 0) {
          return { ...pane, order: zeroOrderIndex + index };
        }
        return pane;
      })
      .sort((a, b) => a.order - b.order)
      .filter(pane => pane.order !== -1);
  };

  const sortedPanes = getSortedPanes();

  // Only the active pane's editor is ever mounted, so a single memoized extensions array
  // (recomputed only when the active pane's language changes) covers every render.
  const activePaneData = sortedPanes[activePane];
  const activePaneName = activePaneData ? activePaneData.preview_name : null;
  const editorExtensions = useMemo(() => [
    ...getLanguageExtension(activePaneName),
    getIndentUnitExtension(activePaneName),
    EDITOR_THEME_EXTENSION,
    INDENT_WITH_TAB_KEYMAP,
    EditorView.lineWrapping
  ], [activePaneName]);

  // Update activePane when controlled by parent (integrated mode)
  useEffect(() => {
    if (propActivePane !== undefined && propActivePane !== activePane) {
      setActivePane(propActivePane);
    }
  }, [propActivePane, activePane]);

  // Ensure activePane is within bounds
  useEffect(() => {
    if (activePane >= sortedPanes.length && sortedPanes.length > 0) {
      setActivePane(0);
    }
  }, [activePane, sortedPanes.length]);

  // Expose interface for form data collection
  useImperativeHandle(ref, () => ({
    getPaneRefs: () => {
      return sortedPanes.map((pane) => {
        return {
          current: {
            getAttribute: (attr) => {
              if (attr === "name") return pane.name;
              if (attr === "id") return pane.name;
              return null;
            },
            value: pane.content || ''
          }
        };
      });
    }
  }));

  // Keep the latest sortedPanes accessible to stable callbacks without adding it as a
  // dependency (it's a brand-new array every render).
  const sortedPanesRef = useRef(sortedPanes);
  sortedPanesRef.current = sortedPanes;

  // Tracks the most recent content this component emitted for each pane index, updated
  // synchronously in onChange (unlike `panes` state, which lags behind by up to 300ms below).
  const lastEmittedContentRef = useRef({});

  // Handle content changes with debouncing. Stable across renders (deps: [setPanes]) so it
  // doesn't force CodeMirror to reconfigure on every keystroke.
  const handleContentChange = useCallback((index, newContent) => {
    if (contentUpdateTimeoutsRef.current[index]) {
      clearTimeout(contentUpdateTimeoutsRef.current[index]);
    }

    contentUpdateTimeoutsRef.current[index] = setTimeout(() => {
      const currentSortedPanes = sortedPanesRef.current;

      setPanes(currentPanes => {
        const updatedPanes = [...currentPanes];
        const originalIndex = updatedPanes.findIndex(p =>
          p.name === currentSortedPanes[index].name
        );

        if (originalIndex !== -1) {
          updatedPanes[originalIndex] = {
            ...updatedPanes[originalIndex],
            content: newContent
          };
        }

        return updatedPanes;
      });

      // Trigger onChange callback if present
      if (currentSortedPanes[index] && currentSortedPanes[index].onChange) {
        currentSortedPanes[index].onChange({
          target: { value: newContent }
        });
      }

      delete contentUpdateTimeoutsRef.current[index];
    }, 300);
  }, [setPanes]);

  // Per-index onChange/ref callbacks, cached so their identity stays stable across renders.
  // A fresh function identity on every render forces @uiw/react-codemirror to reconfigure
  // the editor (rebuilding autocompletion/history), which is what made autocomplete fragile.
  const onChangeCallbacksRef = useRef({});
  const getOnChangeCallback = (index) => {
    if (!onChangeCallbacksRef.current[index]) {
      onChangeCallbacksRef.current[index] = (value) => {
        lastEmittedContentRef.current[index] = value;
        handleContentChange(index, value);
      };
    }
    return onChangeCallbacksRef.current[index];
  };

  const editorRefCallbacksRef = useRef({});
  const getEditorRefCallback = (index) => {
    if (!editorRefCallbacksRef.current[index]) {
      editorRefCallbacksRef.current[index] = (editorRef) => {
        if (editorRef) {
          editorRefs.current[`editor-${index}`] = editorRef;
        }
      };
    }
    return editorRefCallbacksRef.current[index];
  };

  const handlePaneChange = (index) => {
    setActivePane(index);
  };

  // Handle empty state
  if (sortedPanes.length === 0) {
    return (
      <div style={integrated ? integratedStyles.emptyContainer : standaloneStyles.emptyContainer}>
        <div style={commonStyles.emptyMessage}>
          No configuration files available
        </div>
      </div>
    );
  }

  return (
    <div style={integrated ? integratedStyles.container : standaloneStyles.container}>
      {/* Only show tabs in standalone mode */}
      {!integrated && (
        <div style={standaloneStyles.tabContainer}>
          {sortedPanes.map((pane, index) => (
            <button
              key={index}
              onClick={() => handlePaneChange(index)}
              style={activePane === index ? standaloneStyles.activeTab : standaloneStyles.tab}
              onMouseOver={(e) => {
                if (activePane !== index) {
                  e.target.style.backgroundColor = '#e9ecef';
                  e.target.style.borderColor = '#ced4da';
                }
              }}
              onMouseOut={(e) => {
                if (activePane !== index) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = 'transparent';
                }
              }}
            >
              {pane.preview_name}
            </button>
          ))}
        </div>
      )}

      {/* Editor content area */}
      <div style={integrated ? integratedStyles.editorContainer : standaloneStyles.editorContainer}>
        {sortedPanes.map((pane, index) => {
          const isActive = activePane === index;
          
          return (
            <div
              key={index}
              style={{
                ...commonStyles.paneContent,
                display: isActive ? 'block' : 'none',
                height: integrated ? '100%' : 'auto',
              }}
            >
              {isActive && (
                <div style={integrated ? integratedStyles.editorWrapper : standaloneStyles.editorWrapper}>
                  <CodeMirror
                    ref={getEditorRefCallback(index)}
                    value={
                      contentUpdateTimeoutsRef.current[index] !== undefined &&
                      lastEmittedContentRef.current[index] !== undefined
                        ? lastEmittedContentRef.current[index]
                        : (pane.content || '')
                    }
                    height={integrated ? "100%" : "350px"}
                    theme={eclipse}
                    extensions={editorExtensions}
                    onChange={getOnChangeCallback(index)}
                    basicSetup={BASIC_SETUP_CONFIG}
                    id={pane.name}
                    name={pane.name}
                    data-language={pane.preview_name}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default MultiPaneTextArea;
