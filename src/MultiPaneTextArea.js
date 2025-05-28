import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';

import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { StreamLanguage } from '@codemirror/language';

import { eclipse } from '@uiw/codemirror-theme-eclipse';

const MultiPaneTextArea = forwardRef(({ panes, setPanes, isDisplayed }, ref) => {
  let zeroOrderIndex = 10000;
  const sortedPanes = [...panes].map((pane, index) => {
    if (pane.order === 0) {
      return { ...pane, order: zeroOrderIndex + index };
    }
    return pane;
  }).sort((a, b) => a.order - b.order);

  const [activePane, setActivePane] = useState(0);
  const editorRefs = useRef({});
  const contentUpdateTimeoutsRef = useRef({});
  const editorViewsRef = useRef({});

  useImperativeHandle(ref, () => ({
    getPaneRefs: () => {
      return sortedPanes.map((pane, index) => {
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

  const getLanguageExtension = (name) => {
    if (!name) return [StreamLanguage.define(shell)];

    const lowerName = name.toLowerCase();

    if (lowerName.endsWith('.py') || lowerName.includes('python')) {
      return [python()];
    } else if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
      return [markdown()];
    } else if (lowerName.endsWith('.json')) {
      return [json()];
    } else {
      return [StreamLanguage.define(shell)];
    }
  };

  const handleContentChange = (index, newContent) => {
    if (contentUpdateTimeoutsRef.current[index]) {
      clearTimeout(contentUpdateTimeoutsRef.current[index]);
    }

    contentUpdateTimeoutsRef.current[index] = setTimeout(() => {
      setPanes(currentPanes => {
        const updatedPanes = [...currentPanes];

        const originalIndex = updatedPanes.findIndex(p =>
          p.name === sortedPanes[index].name
        );
        if (originalIndex !== -1) {
          updatedPanes[originalIndex] = {
            ...updatedPanes[originalIndex],
            content: newContent
          };
        }

        return updatedPanes;
      });

      if (sortedPanes[index].onChange) {
        sortedPanes[index].onChange({
          target: { value: newContent }
        });
      }

      delete contentUpdateTimeoutsRef.current[index];
    }, 300);
  };

  useEffect(() => {
    if (activePane >= sortedPanes.length && sortedPanes.length > 0) {
      setActivePane(0);
    }
  }, [activePane, sortedPanes.length]);

  const handlePaneChange = (index) => {
    setActivePane(index);
  };

  const containerStyle = {
    border: '1px solid #ccc',
    borderRadius: '5px',
    fontFamily: 'Arial, sans-serif',
    overflow: 'hidden'
  };

  const paneSelectorStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    borderBottom: '1px solid #ccc',
    marginBottom: '0',
    backgroundColor: '#f1f1f1'
  };

  const paneTabStyle = {
    padding: '10px 15px',
    backgroundColor: '#f1f1f1',
    border: '1px solid #ccc',
    borderBottom: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s ease',
    textAlign: 'center',
    outline: 'none',
    margin: '0 2px',
    borderTopLeftRadius: '5px',
    borderTopRightRadius: '5px',
  };

  const activeTabStyle = {
    ...paneTabStyle,
    backgroundColor: '#ffffff',
    borderColor: '#ccc',
    borderBottom: '1px solid #ffffff',
    fontWeight: 'bold',
    position: 'relative',
    zIndex: 1
  };

  const paneContentStyle = {
    position: 'relative'
  };

  const editorWrapperStyle = {
    height: '100%',
    overflow: 'auto'
  };

  return (
    <div style={containerStyle} className="cm-container">
      <div style={paneSelectorStyle} className="pane-tabs">
        {sortedPanes.map((pane, index) => {
          if(pane.order === -1) return null;

          return (
            <button
              key={index}
              onClick={() => handlePaneChange(index)}
              style={activePane === index ? activeTabStyle : paneTabStyle}
              className={activePane === index ? 'pane-tab pane-tab-active' : 'pane-tab'}
              aria-selected={activePane === index}
              role="tab"
            >
              {pane.preview_name}
            </button>
          );
        })}
      </div>

      {sortedPanes.map((pane, index) => {
        const isActive = activePane === index;

        return (
          <div
            key={index}
            style={{
              ...paneContentStyle,
              display: isActive ? 'block' : 'none'
            }}
          >
            {isActive && (
              <div style={editorWrapperStyle}>
                <CodeMirror
                  ref={ref => {
                    if (ref) {
                      editorRefs.current[`editor-${index}`] = ref;
                      editorViewsRef.current[`editor-${index}`] = {
                        pane: pane,
                        index: index,
                        content: pane.content || ''
                      };
                    }
                  }}
                  value={pane.content || ''}
                  height="100%"
                  theme={eclipse}
                  extensions={[
                    ...getLanguageExtension(pane.preview_name),
                    EditorView.theme({
                        "&": { caretColor: "black" },
                        ".cm-cursor": { borderLeftColor: "black !important", borderLeftWidth: "2px" }
                    }),
                    EditorView.lineWrapping
                  ]}
                  onChange={(value) => {
                    handleContentChange(index, value);
                    if (editorViewsRef.current[`editor-${index}`]) {
                      editorViewsRef.current[`editor-${index}`].content = value;
                    }
                  }}
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLine: false,
                    foldGutter: true,
                    indentOnInput: true,
                    tabSize: 2,
                  }}
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
  );
});

export default MultiPaneTextArea;
