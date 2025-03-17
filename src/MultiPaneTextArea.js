import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const MultiPaneTextArea = forwardRef(({ panes, setPanes }, ref) => {
  let zeroOrderIndex = 10000;  
  panes.forEach((pane, index) => {
    if (pane.order === 0) {
      pane.order = zeroOrderIndex;
      zeroOrderIndex++;
    }
  });

  panes = panes.sort((a, b) => {
    return a.order - b.order;
  });
 
  const [activePane, setActivePane] = useState(0);
  const paneRefs = useRef([]);
  const editorInstancesRef = useRef({});

  if (paneRefs.current.length !== panes.length) {
    paneRefs.current = panes.map((_, i) => paneRefs.current[i] || React.createRef());
  }

  useImperativeHandle(ref, () => ({
    getPaneRefs: () => paneRefs.current,
  }));

  const handlePaneChange = (index) => {
    setActivePane(index);
    
    // Refresh CodeMirror when switching tabs to ensure proper rendering
    setTimeout(() => {
      const editor = editorInstancesRef.current[`editor-${index}`];
      if (editor && typeof editor.refresh === 'function') {
        editor.refresh();
      }
    }, 10);
  };

  // Determine language mode based on file name
  const getLanguageMode = (name) => {
    if (!name) return 'shell';
    
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith('.py') || lowerName.includes('python')) {
      return 'python';
    }
    return 'shell';
  };

  useEffect(() => {
    if (typeof window.CodeMirror !== 'undefined') {
      panes.forEach((pane, index) => {
        const textarea = paneRefs.current[index]?.current;
        if (!textarea) return;
        
        const editorKey = `editor-${index}`;
        
        // If this textarea already has a CodeMirror instance, skip initialization
        if (textarea.nextSibling && textarea.nextSibling.classList.contains('CodeMirror')) {
          return;
        }
        
        const mode = getLanguageMode(pane.preview_name);
        
        try {
          const editor = window.CodeMirror.fromTextArea(textarea, {
            mode: mode,
            theme: 'eclipse',
            lineNumbers: true,
            lineWrapping: true,
            viewportMargin: Infinity,
            indentUnit: 2,
            tabSize: 2
          });
          
          editor.setValue(pane.content || '');
          
          editor.on('change', (cm) => {
            const newContent = cm.getValue();
            
            const updatedPanes = [...panes];
            updatedPanes[index].content = newContent;
            setPanes(updatedPanes);
            
            textarea.value = newContent;
            
            if (panes[index].onChange) {
              panes[index].onChange({ target: { value: newContent } });
            }
          });
          
          editorInstancesRef.current[editorKey] = editor;
        } catch (error) {
          console.error('Error initializing CodeMirror:', error);
        }
      });
    }
    
    // Clean up function
    return () => {
      Object.keys(editorInstancesRef.current).forEach(key => {
        try {
          const editor = editorInstancesRef.current[key];
          if (editor && typeof editor.toTextArea === 'function') {
            editor.toTextArea();
          }
          delete editorInstancesRef.current[key];
        } catch (error) {
          console.error('Error cleaning up CodeMirror instance:', error);
        }
      });
    };
  }, [panes.length, activePane]);

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

  const textareaStyle = { 
    width: '100%',
    minHeight: '400px',
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.5',
    display: 'none' // Will be replaced by CodeMirror
  };

  useEffect(() => {
    if (activePane >= panes.length) {
      setActivePane(0);
    }
  }, [activePane, panes.length]);

  return (
    <div style={containerStyle} className="cm-container">
      <div style={paneSelectorStyle} className="pane-tabs">
        {panes.map((pane, index) => {
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
      
      {panes.map((pane, index) => (
        <div
          key={index}
          style={{
            ...paneContentStyle,
            display: activePane === index ? 'block' : 'none'
          }}
        >
          <textarea
            ref={paneRefs.current[index]}
            id={pane.name}
            name={pane.name}
            defaultValue={pane.content || ''}
            style={textareaStyle}
            data-language={getLanguageMode(pane.preview_name)}
          />
        </div>
      ))}
    </div>
  );
});

export default MultiPaneTextArea;
