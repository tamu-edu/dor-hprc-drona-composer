// Styles for integrated mode (used within modals)
const integratedStyles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: 'white',
  },
  editorContainer: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0, // Important for proper flex behavior
  },
  editorWrapper: {
    height: '100%',
    overflow: 'auto',
    backgroundColor: 'white',
    flexGrow: 1,
  },
  emptyContainer: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
};

// Styles for standalone mode (independent component)
const standaloneStyles = {
  container: {
    border: '1px solid #dee2e6',
    borderRadius: '0.375rem',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    overflow: 'hidden',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  tabContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    borderBottom: '1px solid #dee2e6',
    marginBottom: '0',
    backgroundColor: '#f8f9fa',
    padding: '0.25rem 0.5rem',
    gap: '0.25rem',
  },
  tab: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    outline: 'none',
    color: '#6c757d',
    lineHeight: '1.2',
  },
  activeTab: {
    padding: '0.5rem 1rem',
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    outline: 'none',
    color: '#500000',
    lineHeight: '1.2',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-1px)',
  },
  editorContainer: {
    position: 'relative',
  },
  editorWrapper: {
    height: '350px',
    overflow: 'auto',
    backgroundColor: 'white',
  },
  emptyContainer: {
    height: '350px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
};

// Common styles used in both modes
const commonStyles = {
  paneContent: {
    position: 'relative',
    backgroundColor: 'white',
  },
  emptyMessage: {
    color: '#6c757d',
    fontSize: '14px',
    fontStyle: 'italic',
  },
};


export {integratedStyles, standaloneStyles, commonStyles }
