import React, { useState } from 'react';
import MultiPaneTextArea from './MultiPaneTextArea';
import AddFileModal from './AddFileModal';
import { usePaneManagement } from './hooks/usePaneManagement';
import { useEditorSplits } from './hooks/useEditorSplits';

const AlertBlock = ({ messages, type, styles, isFullscreen }) => {
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
    <div className={config.className} style={{ ...styles.messageAlert, margin: isFullscreen ? '4px 8px' : '0.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h6 className="alert-heading" style={styles.alertTitle}>{config.title}</h6>
        <button
          onClick={() => setIsVisible(false)}
          style={{ background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', padding: '0', marginLeft: '10px', opacity: 0.6, lineHeight: 1 }}
          onMouseOver={(e) => e.target.style.opacity = 1}
          onMouseOut={(e) => e.target.style.opacity = 0.6}
        >×</button>
      </div>
      <ul style={styles.alertList}>
        {filteredMessages.map((message, index) => (
          <li key={message.id || index} style={styles.alertItem}>{message.text}</li>
        ))}
      </ul>
    </div>
  );
};

const makeColumnHeaderStyle = (isFullscreen) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: isFullscreen ? '#e8e8e8' : '#f0f0f0',
  borderBottom: '1px solid #dee2e6',
  padding: '0 6px',
  height: isFullscreen ? '32px' : '36px',
  gap: '3px',
  flexShrink: 0,
  overflow: 'hidden',
});

const makeTabStyle = (isActive) => ({
  padding: '3px 10px',
  fontSize: '12px',
  fontWeight: isActive ? '600' : '400',
  color: isActive ? '#500000' : '#6c757d',
  backgroundColor: isActive ? 'white' : 'transparent',
  border: `1px solid ${isActive ? '#dee2e6' : 'transparent'}`,
  borderRadius: '3px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  lineHeight: '1.2',
});

const actionBtnStyle = {
  padding: '2px 7px',
  fontSize: '13px',
  color: '#6c757d',
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  borderRadius: '3px',
  cursor: 'pointer',
  flexShrink: 0,
  lineHeight: 1,
};

const SplitColumnHeader = ({ split, splits, sortedPanes, onSetActivePane, onAddSplit, onRemoveSplit, onAddFile, onRemovePane, splitIndex, isFullscreen }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  return (
    <div style={makeColumnHeaderStyle(isFullscreen)}>
      <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', flex: 1, alignItems: 'center', scrollbarWidth: 'none' }}>
        {sortedPanes.map((pane, idx) => {
          const isActive = split.activePaneIndex === idx;
          const isHovered = hoveredIdx === idx;
          const isCustom = !!pane.custom;
          return (
            <div
              key={idx}
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <button
                style={{ ...makeTabStyle(isActive), paddingRight: isCustom && isHovered ? '20px' : undefined }}
                onClick={() => onSetActivePane(split.id, idx)}
              >
                {pane.preview_name}
              </button>
              {isCustom && isHovered && (
                <button
                  style={{
                    position: 'absolute', right: '3px',
                    background: 'none', border: 'none', padding: '0 2px',
                    fontSize: '11px', lineHeight: 1, cursor: 'pointer',
                    color: isActive ? '#500000' : '#6c757d',
                    fontWeight: '700',
                  }}
                  onClick={(e) => { e.stopPropagation(); onRemovePane(pane.name, idx, split.id); }}
                  title="Remove file"
                >×</button>
              )}
            </div>
          );
        })}
        {splitIndex === 0 && (
          <button
            style={{ ...actionBtnStyle, fontSize: '16px', padding: '0 6px', color: '#888' }}
            onClick={onAddFile}
            title="Add file to job"
            onMouseOver={(e) => { e.currentTarget.style.color = '#500000'; e.currentTarget.style.backgroundColor = '#e2e2e2'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            +
          </button>
        )}
      </div>
      <button
        style={actionBtnStyle}
        onClick={() => onAddSplit(splitIndex, split.activePaneIndex)}
        title="Split editor right"
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e2e2'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        ⊞
      </button>
      {splits.length > 1 && (
        <button
          style={actionBtnStyle}
          onClick={() => onRemoveSplit(split.id)}
          title="Close split"
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee'; e.currentTarget.style.color = '#c00'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6c757d'; }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

const SplitResizeHandle = ({ index, isResizing, onMouseDown }) => (
  <div
    style={{
      width: '4px',
      cursor: 'ew-resize',
      backgroundColor: isResizing ? '#500000' : '#dee2e6',
      flexShrink: 0,
      transition: 'background-color 0.15s',
    }}
    onMouseDown={(e) => onMouseDown(index, e)}
    onMouseOver={(e) => { if (!isResizing) e.currentTarget.style.backgroundColor = '#adb5bd'; }}
    onMouseOut={(e) => { if (!isResizing) e.currentTarget.style.backgroundColor = isResizing ? '#500000' : '#dee2e6'; }}
  />
);


const PreviewPanel = ({
  leftWidth,
  messages,
  multiPaneRef,
  panes,
  setPanes,
  styles,
  isFullscreen = false,
}) => {
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const { sortedPanes } = usePaneManagement(panes);
  const { splits, widths, resizingHandle, containerRef, addSplit, removeSplit, setActivePaneForSplit, handleResizeStart } = useEditorSplits();

  const handleRemovePane = (paneName, paneIdx, splitId) => {
    setPanes(prev => prev.filter(p => p.name !== paneName));
    // If the removed pane was active, move active to previous or 0
    const currentActive = splits.find(s => s.id === splitId)?.activePaneIndex;
    if (currentActive === paneIdx) {
      setActivePaneForSplit(splitId, Math.max(0, paneIdx - 1));
    }
  };

  const handleAddFile = ({ name, content }) => {
    setPanes(prev => {
      let finalName = name;
      const existingNames = new Set(prev.map(p => p.name));
      if (existingNames.has(finalName)) {
        let counter = 1;
        const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
        const base = ext ? name.slice(0, -ext.length) : name;
        while (existingNames.has(`${base}_${counter}${ext}`)) counter++;
        finalName = `${base}_${counter}${ext}`;
      }
      return [...prev, { preview_name: finalName, name: finalName, content, order: 20000 + prev.length, custom: true }];
    });
  };

  const hasMessages = messages?.some(m => ['error', 'warning', 'note'].includes(m.type));

  const outerStyle = {
    ...styles.leftPane,
    width: `${leftWidth}%`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRight: isFullscreen ? 'none' : styles.leftPane.borderRight,
  };

  return (
    <div style={outerStyle}>
      {hasMessages && (
        <>
          <AlertBlock messages={messages} type="error" styles={styles} isFullscreen={isFullscreen} />
          <AlertBlock messages={messages} type="warning" styles={styles} isFullscreen={isFullscreen} />
          <AlertBlock messages={messages} type="note" styles={styles} isFullscreen={isFullscreen} />
        </>
      )}

      <div ref={containerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {splits.map((split, splitIndex) => (
          <React.Fragment key={split.id}>
            <div style={{ display: 'flex', flexDirection: 'column', width: `${widths[splitIndex]}%`, overflow: 'hidden', minWidth: '150px' }}>
              <SplitColumnHeader
                split={split}
                splits={splits}
                sortedPanes={sortedPanes}
                onSetActivePane={setActivePaneForSplit}
                onAddSplit={addSplit}
                onRemoveSplit={removeSplit}
                onAddFile={() => setShowAddFileModal(true)}
                onRemovePane={handleRemovePane}
                splitIndex={splitIndex}
                isFullscreen={isFullscreen}
              />
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <MultiPaneTextArea
                  ref={splitIndex === 0 ? multiPaneRef : undefined}
                  panes={panes}
                  setPanes={setPanes}
                  isDisplayed={true}
                  activePane={split.activePaneIndex}
                  integrated={true}
                />
              </div>
            </div>
            {splitIndex < splits.length - 1 && (
              <SplitResizeHandle
                index={splitIndex}
                isResizing={resizingHandle === splitIndex}
                onMouseDown={handleResizeStart}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <AddFileModal
        isOpen={showAddFileModal}
        onClose={() => setShowAddFileModal(false)}
        onAddFile={handleAddFile}
        defaultPath={document.drona_dir || '/'}
      />
    </div>
  );
};

export default PreviewPanel;
