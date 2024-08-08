import React, { useState } from 'react';

function MultiPaneTextArea({ panes, setPanes }) {
  const [activePane, setActivePane] = useState(0);

  const handlePaneChange = (index) => {
    setActivePane(index);
  };

  const handleTextChange = (e) => {
    const updatedPanes = [...panes];
    updatedPanes[activePane].content = e.target.value;
    setPanes(updatedPanes);
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
  }

  return (
    <div style={containerStyle}>
      <div style={paneSelectorStyle}>
        {panes.map((pane, index) => (
          <button
            key={index}
            onClick={() => handlePaneChange(index)}
            style={activePane === index ? activeTabStyle : paneTabStyle}
            aria-selected={activePane === index}
            role="tab"
          >
            {pane.name}
          </button>
        ))}
      </div>
      <div style={paneContentStyle}>
        <textarea
          id={`pane-${activePane}`}
          className="form-control"
          rows="20"
          value={panes[activePane].content}
          onChange={handleTextChange}
          placeholder={`${panes[activePane].name} content`}
          style={textareaStyle} 
	/>
	  
      </div>
    </div>
  );
}

export default MultiPaneTextArea;
