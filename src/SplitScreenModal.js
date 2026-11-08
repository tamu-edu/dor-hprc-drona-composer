import React, { useRef, useEffect } from "react";
import { styles } from "./styles/SplitScreenModalStyles";
import { useResizeHandle } from "./hooks/useResizeHandle";
import PreviewPanel from "./PreviewPanel";
import { DEFAULT_BUTTON_LABELS } from "./schemaRendering/utils/buttonLabels";
import StreamingPanel from "./StreamingPanel";

// ── Normal modal header ──────────────────────────────────────────────────────
const ModalHeader = ({ isFullscreen, onFullscreen, onClose, onMinimize, styles, title }) => (
  <div style={styles.header}>
    <h5 style={styles.title}>{title}</h5>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button style={styles.minimizeButton} onClick={onFullscreen}
        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        title="Fullscreen">⤢</button>
      <button style={styles.minimizeButton} onClick={onMinimize}
        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        title="Minimize">−</button>
      <button style={styles.closeButton} onClick={onClose}
        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        title="Close">×</button>
    </div>
  </div>
);

// ── IDE title bar (fullscreen only, 36px) ───────────────────────────────────
const ideIconBtn = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.8)',
  cursor: 'pointer',
  fontSize: '16px',
  padding: '0 4px',
  lineHeight: 1,
};

// Run button text and tooltip. A preview runs once: after Run the button is disabled and
// says what happened, so it's clear it can't be pressed again.
const AGAIN_HINT = "Close this window and generate again to start a new run.";
export const runButtonState = (submitLabel, status, disabled) => {
  if (!disabled) return { label: submitLabel, title: "" };
  switch (status) {
    case 'submitting':
    case 'running':
      return { label: 'Running…', title: 'This run is in progress.' };
    case 'completed':
      return { label: 'Done ✓', title: `Already run from this preview. ${AGAIN_HINT}` };
    case 'failed':
      return { label: 'Finished with errors', title: `Already run from this preview; see the output. ${AGAIN_HINT}` };
    case 'error':
      return { label: 'Not started', title: `The run could not be started; see the output. ${AGAIN_HINT}` };
    default:
      return { label: 'Submitted', title: `Already run from this preview. ${AGAIN_HINT}` };
  }
};

const IDEHeader = ({ onFullscreen, onMinimize, onClose, submitLabel, title, run }) => (
  <div style={{
    backgroundColor: '#500000',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: '8px',
    flexShrink: 0,
    userSelect: 'none',
  }}>
    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '500', flex: 1 }}>
      {title}
    </span>
    <button type="submit" form="slurm-config-form" className="ide-run-button"
      disabled={run.disabled} title={run.title}
    >{run.label}</button>
    <button style={ideIconBtn} onClick={onMinimize} title="Minimize"
      onMouseOver={(e) => e.currentTarget.style.color = 'white'}
      onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
    >−</button>
    <button style={ideIconBtn} onClick={onFullscreen} title="Exit fullscreen"
      onMouseOver={(e) => e.currentTarget.style.color = 'white'}
      onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
    >⤡</button>
    <button style={ideIconBtn} onClick={onClose} title="Close"
      onMouseOver={(e) => e.currentTarget.style.color = 'white'}
      onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
    >×</button>
  </div>
);

// ── IDE status bar (fullscreen only, 22px) ───────────────────────────────────
const statusColors = {
  idle: null, ready: null,
  submitting: '#b58900',
  running: '#268bd2',
  completed: '#2aa198',
  failed: '#dc322f',
  killed: '#dc322f',
};

const IDEStatusBar = ({ status }) => {
  const color = statusColors[status] || null;
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Ready';
  return (
    <div style={{
      backgroundColor: '#3a0000',
      color: 'rgba(255,255,255,0.7)',
      height: '22px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      fontSize: '11px',
      flexShrink: 0,
      gap: '16px',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        {color && <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />}
        {label}
      </span>
      <span style={{ marginLeft: 'auto', opacity: 0.55 }}>
        ⊞ split editor · drag dividers to resize · ESC to exit fullscreen
      </span>
    </div>
  );
};

// ── Shared resize handle ─────────────────────────────────────────────────────
const ResizeHandle = ({ isResizing, onMouseDown, styles }) => (
  <div
    style={isResizing ? styles.resizeHandle.active : styles.resizeHandle.base}
    onMouseDown={onMouseDown}
    onMouseOver={(e) => { if (!isResizing) e.target.style.backgroundColor = '#adb5bd'; }}
    onMouseOut={(e) => { if (!isResizing) e.target.style.backgroundColor = '#dee2e6'; }}
    title="Drag to resize panes"
  >
    <div style={styles.resizeHandle.indicator} />
  </div>
);

// ── Normal footer ────────────────────────────────────────────────────────────
const ModalFooter = ({ onClose, styles, run }) => (
  <div style={styles.footer}>
    <button type="submit" form="slurm-config-form" className="btn composer-generate-button composer-run-button"
      style={{ marginRight: '0.5rem' }} disabled={run.disabled} title={run.title}
    >
      {run.label}
      {!run.disabled && <span className="composer-generate-arrow" aria-hidden="true">&rarr;</span>}
    </button>
    <button onClick={onClose} style={styles.button.secondary}
      onMouseOver={(e) => e.target.style.backgroundColor = '#545b62'}
      onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
    >Close</button>
  </div>
);

// ── Minimized bubble ─────────────────────────────────────────────────────────
const MinimizedModal = ({ onExpand, styles }) => (
  <div style={styles.minimizedContainer} onClick={onExpand}
    onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
  >
    <div style={styles.minimizedIcon}>
      <span style={styles.minimizedText}>JC</span>
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const SplitScreenModal = ({
  isOpen,
  onClose,
  messages,
  multiPaneRef,
  panes,
  setPanes,
  outputLines,
  htmlOutput,
  status,
  onMinimize: onMinimizeCallback,
  onExpand: onExpandCallback,
  forceMinimized = null,
  submitLabel = DEFAULT_BUTTON_LABELS.submit,
  title = DEFAULT_BUTTON_LABELS.title,
  isSubmitDisabled = false,
}) => {
  const run = { ...runButtonState(submitLabel, status, isSubmitDisabled), disabled: !!isSubmitDisabled };
  const contentRef = useRef(null);
  const modalRef = useRef(null);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [outputCollapsed, setOutputCollapsed] = React.useState(false);

  useEffect(() => {
    if (forceMinimized !== null) setIsMinimized(forceMinimized);
  }, [forceMinimized]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  const { leftWidth, isResizing, handleMouseDown } = useResizeHandle(55);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [outputLines, htmlOutput]);

  const handleMinimize = () => {
    setIsMinimized(true);
    if (onMinimizeCallback) onMinimizeCallback();
  };

  const handleExpand = () => {
    setIsMinimized(false);
    if (onExpandCallback) onExpandCallback();
  };

  if (!isOpen) return null;
  if (isMinimized) return <MinimizedModal onExpand={handleExpand} styles={styles} />;

  const overlayStyle = isFullscreen
    ? { position: 'fixed', inset: 0, zIndex: 1000 }
    : styles.overlay;

  const modalStyle = isFullscreen
    ? { ...styles.modal, width: '100%', height: '100vh', maxWidth: 'none', maxHeight: '100vh', borderRadius: 0, display: 'flex', flexDirection: 'column' }
    : styles.modal;

  return (
    <div style={overlayStyle} onClick={isFullscreen ? undefined : handleMinimize}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} ref={modalRef} data-modal-ref>

        {isFullscreen
          ? <IDEHeader onFullscreen={() => setIsFullscreen(false)} onMinimize={handleMinimize} onClose={onClose} submitLabel={submitLabel} title={title} run={run} />
          : <ModalHeader isFullscreen={false} onFullscreen={() => setIsFullscreen(true)} onMinimize={handleMinimize} onClose={onClose} styles={styles} title={title} />
        }

        <div style={styles.contentContainer}>
          <PreviewPanel
            leftWidth={outputCollapsed ? 100 : leftWidth}
            messages={messages}
            multiPaneRef={multiPaneRef}
            panes={panes}
            setPanes={setPanes}
            styles={styles}
            isFullscreen={isFullscreen}
          />
          {!outputCollapsed && <ResizeHandle isResizing={isResizing} onMouseDown={handleMouseDown} styles={styles} />}
          <StreamingPanel
            leftWidth={leftWidth}
            status={status}
            htmlOutput={htmlOutput}
            outputLines={outputLines}
            contentRef={contentRef}
            styles={styles}
            isFullscreen={isFullscreen}
            isCollapsed={outputCollapsed}
            onToggleCollapse={() => setOutputCollapsed(c => !c)}
          />
        </div>

        {isFullscreen
          ? <IDEStatusBar status={status} />
          : <ModalFooter onClose={onClose} styles={styles} run={run} />
        }

      </div>
    </div>
  );
};

export default SplitScreenModal;
