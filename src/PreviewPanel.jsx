import React, { useState } from 'react';
import MultiPaneTextArea from './MultiPaneTextArea';

const FileTabBar = ({ sortedPanes, activePane, onTabClick, styles }) => {
  const getTabHoverHandler = (index) => {
    if (activePane === index) return {};
    return {
      onMouseOver: (e) => {
        e.target.style.backgroundColor = '#e9ecef';
        e.target.style.borderColor = '#ced4da';
      },
      onMouseOut: (e) => {
        e.target.style.backgroundColor = 'transparent';
        e.target.style.borderColor = 'transparent';
      }
    };
  };

  return (
    <div style={styles.leftPaneTitle} className="custom-scrollbar">
      <div style={styles.tabContainer}>
        <span style={styles.configLabel}>Files:</span>
        {sortedPanes.map((pane, index) => (
          <button
            key={`${pane.preview_name}-${index}`}
            onClick={() => onTabClick(index)}
            style={activePane === index ? styles.tab.active : styles.tab.base}
            {...getTabHoverHandler(index)}
          >
            {pane.preview_name}
          </button>
        ))}
      </div>
    </div>
  );
};



const AlertBlock = ({ messages, type, styles }) => {
  const [isVisible, setIsVisible] = useState(true);
  const filteredMessages = messages?.filter(msg => msg.type === type) || [];
  
  if (!isVisible || filteredMessages.length === 0) return null;

  const alertTypes = {
    error: { className: 'alert alert-danger', title: 'Errors:' },
    warning: { className: 'alert alert-warning', title: 'Warnings:' },
    note: { className: 'alert alert-info', title: 'Notes:' }
  };

  const config = alertTypes[type];
  if (!config) return null;

  return (
    <div className={config.className} style={styles.messageAlert}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h6 className="alert-heading" style={styles.alertTitle}>
          {config.title}
        </h6>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: '0',
            marginLeft: '10px',
            opacity: 0.6,
            lineHeight: 1
          }}
          onMouseOver={(e) => e.target.style.opacity = 1}
          onMouseOut={(e) => e.target.style.opacity = 0.6}
          title={`Close all ${type} messages`}
        >
          ×
        </button>
      </div>
      <ul style={styles.alertList}>
        {filteredMessages.map((message, index) => (
          <li key={message.id || index} style={styles.alertItem}>
            {message.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

const PreviewPanel = ({ 
  leftWidth, 
  sortedPanes, 
  activePane, 
  setActivePane, 
  messages,
  multiPaneRef, 
  panes, 
  setPanes, 
  styles
}) => {
  return (
    <div style={{...styles.leftPane, width: `${leftWidth}%`}}>
      <FileTabBar 
        sortedPanes={sortedPanes} 
        activePane={activePane} 
        onTabClick={setActivePane} 
        styles={styles} 
      />
      <div style={styles.leftPaneContent}>
        <AlertBlock messages={messages} type="error" styles={styles} />
        <AlertBlock messages={messages} type="warning" styles={styles} />
        <AlertBlock messages={messages} type="note" styles={styles} />
        <div style={styles.editorContainer}>
          <MultiPaneTextArea
            ref={multiPaneRef}
            panes={panes}
            setPanes={setPanes}
            isDisplayed={true}
            activePane={activePane}
            integrated={true}
          />
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
