// SplitScreenModal.jsx - Clean Rewrite with Integrated Design
import React, { useRef, useEffect, useState } from "react";
import MultiPaneTextArea from "./MultiPaneTextArea";
import { styles } from "./styles/SplitScreenModalStyles";

function SplitScreenModal({
  isOpen,
  onClose,
  warningMessages,
  multiPaneRef,
  panes,
  setPanes,
  outputLines,
  htmlOutput,
  status,
  onSubmit
}) {
  const contentRef = useRef(null);
  const modalRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(55);
  const [isResizing, setIsResizing] = useState(false);
  const [activePane, setActivePane] = useState(0);

  // Auto-scroll streaming content
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [outputLines, htmlOutput]);

  // Process panes like MultiPaneTextArea
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

  // Update active pane if needed
  useEffect(() => {
    if (activePane >= sortedPanes.length && sortedPanes.length > 0) {
      setActivePane(0);
    }
  }, [activePane, sortedPanes.length]);

  // Resize functionality
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (!isResizing || !modalRef.current) return;
    const modalRect = modalRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - modalRect.left) / modalRect.width) * 100;
    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, leftWidth]);

  if (!isOpen) return null;

  const getStatusBadge = () => {
    if (!status || status === 'idle') {
      return (
        <span style={styles.statusBadge.ready}>
          Ready
        </span>
      );
    }
    
    const statusConfig = {
      submitting: { bg: '#ffc107', color: '#000' },
      running: { bg: '#007bff', color: '#fff' },
      completed: { bg: '#28a745', color: '#fff' },
      failed: { bg: '#dc3545', color: '#fff' }
    };

    const config = statusConfig[status] || { bg: '#6c757d', color: '#fff' };

    return (
      <span style={{
        ...styles.statusBadge.base,
        backgroundColor: config.bg,
        color: config.color
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getStreamingContent = () => {
    if (status === 'running' || status === 'completed' || status === 'failed') {
      return htmlOutput ? (
        <div
          style={styles.streamingPre}
          dangerouslySetInnerHTML={{ __html: htmlOutput }}
        />
      ) : (
        <pre style={styles.streamingPre}>
          {outputLines && outputLines.length > 0 ? 
            outputLines.join('') : 
            'Starting job execution...'
          }
        </pre>
      );
    }

    return (
      <div style={styles.placeholder}>
        <div style={styles.placeholder.title}>
          Live Output Stream
        </div>
        <div style={styles.placeholder.subtitle}>
          Job execution output will appear here in real-time once you submit your configuration.
        </div>
      </div>
    );
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} ref={modalRef}>
        {/* Header */}
        <div style={styles.header}>
          <h5 style={styles.title}>Job Preview</h5>
          <button 
            style={styles.closeButton}
            onClick={onClose}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Content Container */}
        <div style={styles.contentContainer}>
          {/* Left Pane - Preview */}
          <div style={{...styles.leftPane, width: `${leftWidth}%`}}>
            {/* Title with integrated tabs */}
            <div style={{...styles.leftPaneTitle, scrollbarHeight: "4px"}} className="custom-scrollbar">
              <div style={styles.tabContainer}>
                <span style={styles.configLabel}>Files:</span>
                {sortedPanes.map((pane, index) => (
                  <button
                    key={index}
                    onClick={() => setActivePane(index)}
                    style={activePane === index ? styles.tab.active : styles.tab.base}
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
            </div>

            {/* Content area */}
            <div style={styles.leftPaneContent}>
              {warningMessages && warningMessages.length > 0 && (
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
              )}
              
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

          {/* Resize Handle */}
          <div 
            style={isResizing ? styles.resizeHandle.active : styles.resizeHandle.base}
            onMouseDown={handleMouseDown}
            onMouseOver={(e) => {
              if (!isResizing) {
                e.target.style.backgroundColor = '#adb5bd';
              }
            }}
            onMouseOut={(e) => {
              if (!isResizing) {
                e.target.style.backgroundColor = '#dee2e6';
              }
            }}
            title="Drag to resize panes"
          >
            <div style={styles.resizeHandle.indicator}></div>
          </div>

          {/* Right Pane - Streaming */}
          <div style={{...styles.rightPane, width: `${100 - leftWidth}%`}}>
            <div style={styles.rightPaneTitle}>
              <span>Live Output</span>
              {getStatusBadge()}
            </div>
            <div style={styles.streamingContent} ref={contentRef}>
              {getStreamingContent()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerTip}>
            <strong>Tip:</strong> Configure your job on the left, then submit to see live output on the right. Drag the center divider to resize panes.
          </div>
          <div>
            <button
              type="submit"
              form="slurm-config-form"
              style={styles.button.primary}
              onMouseOver={(e) => e.target.style.backgroundColor = '#500000'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'maroon'}
            >
              Submit Job
            </button>
            <button
              onClick={onClose}
              style={styles.button.secondary}
              onMouseOver={(e) => e.target.style.backgroundColor = '#545b62'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplitScreenModal;
