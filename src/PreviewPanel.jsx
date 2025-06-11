import React from 'react';
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

const WarningAlert = ({ warningMessages, styles }) => {
  if (!warningMessages || warningMessages.length === 0) return null;

  return (
    <div className="alert alert-warning" style={styles.warningAlert}>
      <h6 className="alert-heading" style={styles.warningTitle}>
        Configuration Warnings:
      </h6>
      <ul style={styles.warningList}>
        {warningMessages.map((warning, index) => (
          <li key={index} style={styles.warningItem}>{warning}</li>
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
  warningMessages,
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
        <WarningAlert 
          warningMessages={warningMessages} 
          styles={styles} 
        />

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
