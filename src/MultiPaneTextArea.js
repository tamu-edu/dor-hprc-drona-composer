import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const MultiPaneTextArea = forwardRef(({ panes, setPanes }, ref) => {

  // tabs with order 0 will be moved to the right
  // A specific distinct high value i is assigned to them to prevent order change on rerendering
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

  if (paneRefs.current.length !== panes.length) {
    paneRefs.current = panes.map((_, i) => paneRefs.current[i] || React.createRef());
  }

  useImperativeHandle(ref, () => ({
	  getPaneRefs: () => paneRefs.current,
  }));

  const handlePaneChange = (index) => {
    setActivePane(index);
  };

  const handleTextChange = (e, index) => {
    const updatedPanes = [...panes];
    updatedPanes[index].content = e.target.value;
    setPanes(updatedPanes);
    if(panes[index].onChange) panes[index].onChange(e);
  };

  const containerStyle = {
    border: '1px solid #ccc',
    borderRadius: '5px',
    fontFamily: 'Arial, sans-serif',
    overflow: 'hidden',
  };

  const paneSelectorStyle = {
    display: 'flex',
    borderBottom: '1px solid #ccc',
    marginBottom: '10px',
  };

  const paneTabStyle = {
    flex: '1',
    padding: '10px 15px',
    backgroundColor: '#f1f1f1',
    border: '1px solid #ccc',
    borderBottom: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s ease',
    textAlign: 'center',
    outline: 'none',
  };

  const activeTabStyle = {
    ...paneTabStyle,
    backgroundColor: '#ffffff',
    borderColor: '#ccc',
    borderBottom: '1px solid #ffffff',
    fontWeight: 'bold',
  };

  const paneContentStyle = {
    padding: '10px',
  };

  const textareaStyle = { 
    border: 'none',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '5px'
  };

  useEffect(() => {
    if (activePane >= panes.length) {
      setActivePane(0);
    }
  }, [activePane, panes.length]);

  return (
    <div style={containerStyle}>
      <div style={paneSelectorStyle}>
        {panes.map((pane, index) => {
	  if(pane.order == -1) return;

	  return (
          <button
            key={index}
            onClick={() => handlePaneChange(index)}
            style={activePane === index ? activeTabStyle : paneTabStyle}
            aria-selected={activePane === index}
            role="tab"
          >
            {pane.preview_name}
          </button>
        )
	})}

      </div>
      {panes.map((pane, index) => (
        <div
          key={index}
          id={`pane-${index}`}
          style={{
            ...paneContentStyle,
            display: activePane === index ? 'block' : 'none',
          }}
        >
          <textarea
            className="form-control"
            rows="20"
            ref={paneRefs.current[index]}
            id={pane.name}
            value={pane.content}
            name={pane.name}
            onChange={(e) => handleTextChange(e, index)}
            placeholder={`${pane.preview_name} content`}
            style={textareaStyle}
          />
        </div>
      ))}
    </div>
  );
});

export default MultiPaneTextArea;

