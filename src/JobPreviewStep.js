import React, { useRef, useEffect } from "react";
import { styles } from "./styles/SplitScreenModalStyles";
import { useResizeHandle } from "./hooks/useResizeHandle";
import PreviewPanel from "./PreviewPanel";
import StreamingPanel from "./StreamingPanel";

const ResizeHandle = ({ isResizing, onMouseDown }) => (
  <div
    style={isResizing ? styles.resizeHandle.active : styles.resizeHandle.base}
    onMouseDown={onMouseDown}
    onMouseOver={(e) => {
      if (!isResizing) e.target.style.backgroundColor = "#adb5bd";
    }}
    onMouseOut={(e) => {
      if (!isResizing) e.target.style.backgroundColor = "#dee2e6";
    }}
    title="Drag to resize panes"
  >
    <div style={styles.resizeHandle.indicator} />
  </div>
);

function JobPreviewStep({
  messages,
  multiPaneRef,
  panes,
  setPanes,
  outputLines,
  htmlOutput,
  status,
  isSubmitDisabled,
  onBack,
}) {
  const contentRef = useRef(null);
  const [outputCollapsed, setOutputCollapsed] = React.useState(false);
  const { leftWidth, isResizing, handleMouseDown } = useResizeHandle(55);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [outputLines, htmlOutput]);

  return (
    <div className="job-preview-step">
      <div className="job-preview-step__header">
        <h5 className="job-preview-step__title">Job Preview</h5>
        <div className="job-preview-step__actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button
            type="submit"
            form="slurm-config-form"
            className="btn btn-primary maroon-button-filled"
            disabled={isSubmitDisabled}
          >
            Submit Job
          </button>
        </div>
      </div>

      <div className="job-preview-step__panels" style={styles.contentContainer}>
        <PreviewPanel
          leftWidth={outputCollapsed ? 100 : leftWidth}
          messages={messages}
          multiPaneRef={multiPaneRef}
          panes={panes}
          setPanes={setPanes}
          styles={styles}
          isFullscreen={false}
        />
        {!outputCollapsed && (
          <ResizeHandle isResizing={isResizing} onMouseDown={handleMouseDown} />
        )}
        <StreamingPanel
          leftWidth={leftWidth}
          status={status}
          htmlOutput={htmlOutput}
          outputLines={outputLines}
          contentRef={contentRef}
          styles={styles}
          isFullscreen={false}
          isCollapsed={outputCollapsed}
          onToggleCollapse={() => setOutputCollapsed((c) => !c)}
        />
      </div>
    </div>
  );
}

export default JobPreviewStep;
