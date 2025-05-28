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
    minHeight: "50px", // Prevent height collapse
    overflow: "hidden", // Prevent container overflow
  },

  tabContainerScrollbar: {
    // Webkit browsers
    "&::-webkit-scrollbar": {
      height: "4px",
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#ced4da",
      borderRadius: "2px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: "#adb5bd",
    },
  },

  tabContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flex: 1,
    overflowX: "auto",
    overflowY: "hidden",
    whiteSpace: "nowrap",
    scrollbarWidth: "thin", // Firefox
    WebkitOverflowScrolling: "touch", // iOS
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
      border: "1px solid maroon",
      borderRadius: "0.25rem",
      cursor: "pointer",
      marginRight: "0.5rem",
      fontWeight: "500",
      fontSize: "14px",
      transition: "all 0.2s ease",
      backgroundColor: "maroon",
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

export { styles };
