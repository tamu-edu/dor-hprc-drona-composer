// SplitScreenModal.jsx - Clean Rewrite with Integrated Design
import React, { useRef, useEffect, useState } from "react";
import MultiPaneTextArea from "./MultiPaneTextArea";

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
            <div style={styles.leftPaneTitle}>
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
              onMouseOver={(e) => e.target.style.backgroundColor = '#400000'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#500000'}
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

// Consolidated styles object
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  modal: {
    background: "white",
    borderRadius: "0.5rem",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    width: "95%",
    height: "90vh",
    maxHeight: "calc(100vh - 2rem)",
    maxWidth: "1600px",
  },

  header: {
    backgroundColor: "#500000",
    color: "white",
    padding: "1rem 1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: "1.25rem",
    fontWeight: "600",
    margin: 0,
    color: "white",
  },

  closeButton: {
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "white",
    padding: "0.25rem",
    lineHeight: 1,
    background: "none",
    border: "none",
  },

  contentContainer: {
    display: "flex",
    flexGrow: 1,
    overflow: "hidden",
  },

  leftPane: {
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #dee2e6",
    backgroundColor: "white",
    minWidth: "300px",
  },

  leftPaneTitle: {
    padding: "0.75rem 1rem",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #dee2e6",
    fontSize: "13px",
    fontWeight: "600",
    color: "#495057",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  tabContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flex: 1,
  },

  configLabel: {
    marginRight: "1rem",
    fontWeight: "600",
  },

  tab: {
    base: {
      padding: "0.25rem 0.75rem",
      backgroundColor: "transparent",
      border: "1px solid transparent",
      borderRadius: "0.25rem",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      color: "#6c757d",
      transition: "all 0.2s ease",
      lineHeight: "1.2",
    },
    active: {
      padding: "0.25rem 0.75rem",
      backgroundColor: "white",
      border: "1px solid #dee2e6",
      borderRadius: "0.25rem",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "600",
      color: "#500000",
      transition: "all 0.2s ease",
      lineHeight: "1.2",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
    },
  },

  subtitle: {
    fontSize: '12px',
    color: '#6c757d',
  },

  leftPaneContent: {
    padding: "1rem",
    overflowY: "auto",
    flexGrow: 1,
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
  },

  warningAlert: {
    marginBottom: '1rem',
    fontSize: '13px',
  },

  warningTitle: {
    fontSize: '14px',
  },

  warningList: {
    marginBottom: 0,
    paddingLeft: '1.2rem',
  },

  warningItem: {
    marginBottom: '0.25rem',
  },

  editorContainer: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0, // Important for flex child
  },

  resizeHandle: {
    base: {
      width: "6px",
      backgroundColor: "#dee2e6",
      cursor: "ew-resize",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      transition: "background-color 0.2s ease",
    },
    active: {
      width: "6px",
      backgroundColor: "#500000",
      cursor: "ew-resize",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      transition: "background-color 0.2s ease",
    },
    indicator: {
      width: '2px',
      height: '30px',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: '1px',
    },
  },

  rightPane: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#400000",
    minWidth: "200px",
  },

  rightPaneTitle: {
    padding: "0.75rem 1rem",
    backgroundColor: "#400000",
    color: "white",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  streamingContent: {
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    padding: "1rem",
    overflowY: "auto",
    flexGrow: 1,
    backgroundColor: "#400000",
    color: "white",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  streamingPre: {
    margin: 0,
    fontFamily: "monospace",
    color: "white",
    width: "100%",
  },

  placeholder: {
    padding: "2rem",
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    title: {
      fontWeight: '600',
      marginBottom: '0.5rem',
    },
    subtitle: {
      fontSize: '13px',
      lineHeight: '1.5',
      maxWidth: '250px',
    },
  },

  statusBadge: {
    base: {
      padding: "0.25rem 0.5rem",
      borderRadius: "0.25rem",
      fontSize: "0.75rem",
      fontWeight: "600",
      textTransform: "uppercase",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.25rem",
    },
    ready: {
      padding: "0.25rem 0.5rem",
      borderRadius: "0.25rem",
      fontSize: "0.75rem",
      fontWeight: "600",
      textTransform: "uppercase",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.25rem",
      backgroundColor: '#6c757d',
      color: 'white',
    },
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #dee2e6',
    minHeight: '70px',
  },

  footerTip: {
    fontSize: '13px',
    color: '#6c757d',
  },

  button: {
    base: {
      padding: "0.5rem 1rem",
      border: "1px solid #dee2e6",
      borderRadius: "0.25rem",
      cursor: "pointer",
      marginLeft: "0.5rem",
      fontWeight: "500",
      fontSize: "14px",
      transition: "all 0.2s ease",
    },
    primary: {
      padding: "0.5rem 1rem",
      border: "1px solid #500000",
      borderRadius: "0.25rem",
      cursor: "pointer",
      marginRight: "0.5rem",
      fontWeight: "500",
      fontSize: "14px",
      transition: "all 0.2s ease",
      backgroundColor: "#500000",
      color: "white",
    },
    secondary: {
      padding: "0.5rem 1rem",
      border: "1px solid #6c757d",
      borderRadius: "0.25rem",
      cursor: "pointer",
      marginLeft: "0.5rem",
      fontWeight: "500",
      fontSize: "14px",
      transition: "all 0.2s ease",
      backgroundColor: "#6c757d",
      color: "white",
    },
  },
};

export default SplitScreenModal;
