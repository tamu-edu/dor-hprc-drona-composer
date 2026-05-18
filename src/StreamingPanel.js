import React from 'react';

const StatusBadge = ({ status, styles }) => {
  if (!status || status === 'idle') {
    return <span style={styles.statusBadge.ready}>Ready</span>;
  }

  const statusConfig = {
    submitting: { bg: '#ffc107', color: '#000' },
    running: { bg: '#007bff', color: '#fff' },
    completed: { bg: '#28a745', color: '#fff' },
    failed: { bg: '#dc3545', color: '#fff' }
  };

  const config = statusConfig[status] || { bg: '#6c757d', color: '#fff' };

  return (
    <span style={{ ...styles.statusBadge.base, backgroundColor: config.bg, color: config.color }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const StreamingContent = ({ status, htmlOutput, outputLines, styles }) => {
  if (status === 'running' || status === 'completed' || status === 'failed') {
    return htmlOutput ? (
      <div style={styles.streamingPre} dangerouslySetInnerHTML={{ __html: htmlOutput }} />
    ) : (
      <pre style={styles.streamingPre}>
        {outputLines && outputLines.length > 0 ? outputLines.join('') : 'Starting job execution...'}
      </pre>
    );
  }

  return (
    <div style={styles.placeholder}>
      <div style={styles.placeholder.title}>Live Output Stream</div>
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
  styles,
  isFullscreen = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  if (isCollapsed) {
    return (
      <div
        style={{
          ...styles.rightPane,
          width: '28px',
          minWidth: '28px',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={onToggleCollapse}
        title="Show output"
      >
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', userSelect: 'none', fontWeight: '300', letterSpacing: '-2px' }}>«</span>
      </div>
    );
  }

  const titleStyle = isFullscreen
    ? { ...styles.rightPaneTitle, padding: '0 12px', height: '32px', minHeight: '32px' }
    : styles.rightPaneTitle;

  const contentStyle = isFullscreen
    ? { ...styles.streamingContent, padding: '0.5rem 0.75rem', fontSize: '13px' }
    : styles.streamingContent;

  return (
    <div style={{ ...styles.rightPane, width: `${100 - leftWidth}%` }}>
      <div style={titleStyle}>
        <span>Live Output</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isFullscreen && <StatusBadge status={status} styles={styles} />}
          <button
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', padding: '0 2px', lineHeight: 1 }}
            onClick={onToggleCollapse}
            title="Hide output"
            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          >»</button>
        </div>
      </div>
      <div style={contentStyle} ref={contentRef}>
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
