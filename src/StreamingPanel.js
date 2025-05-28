// StreamingPanel.jsx
import React from 'react';

const StatusBadge = ({ status, styles }) => {
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

const StreamingContent = ({ status, htmlOutput, outputLines, styles }) => {
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

const StreamingPanel = ({
  leftWidth,
  status,
  htmlOutput,
  outputLines,
  contentRef,
  styles
}) => {
  return (
    <div style={{...styles.rightPane, width: `${100 - leftWidth}%`}}>
      <div style={styles.rightPaneTitle}>
        <span>Live Output</span>
        <StatusBadge status={status} styles={styles} />
      </div>
      <div style={styles.streamingContent} ref={contentRef}>
        <StreamingContent
          status={status}
          htmlOutput={htmlOutput}
          outputLines={outputLines}
          styles={styles}
        />
      </div>
    </div>
  );
};

export default StreamingPanel;
