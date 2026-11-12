const tableCustomStyles = {
    headCells: {
        style: {
            fontSize: "var(--drona-text-body)",
            fontWeight: "var(--drona-weight-strong)",
            paddingLeft: '0 8px',
            justifyContent: 'center',
            color: 'maroon',
            '&[data-column-sorted="true"]': {
                color: '#003C71',
            },
            '&:hover[data-sortable="true"]': {
                cursor: 'pointer',
                color: '#003C71'
            }
        },
    },
    rows: {
        style: {
	    overflow: 'visible',
            fontSize: "var(--drona-text-body)",
            marginBottom: '15px',
        },
    },
    cells: {
        style: {
            overflow: 'visible',
        },
    },
    table: { 
        style: {
            overflow: 'visible',
        },
    },
    tableWrapper: { 
        style: {
            overflow: 'visible',
        },
    },
    responsiveWrapper: { 
        style: {
            overflow: 'visible',
        },
    },
    pagination: { 
        style: {
            overflow: 'visible',
        },
    },
    
}

// Dense variant for tables embedded in forms (e.g. the dynamicTable element). Same look as the
// submission history table (maroon bold headers, blue when sorted) but drops its overflow
// overrides so a fixed-height table can scroll, and tightens fonts and row spacing.
const compactTableStyles = {
    headRow: {
        style: {
            backgroundColor: '#f8f9fa',
            borderBottom: '2px solid #dee2e6',
            minHeight: '38px',
        },
    },
    headCells: {
        style: {
            ...tableCustomStyles.headCells.style,
            fontSize: "var(--drona-text-data)",
            paddingLeft: '12px',
            paddingRight: '12px',
            justifyContent: 'flex-start',
        },
    },
    rows: {
        style: {
            fontSize: "var(--drona-text-data)",
            minHeight: '40px',
            cursor: 'pointer',
            '&:not(:last-of-type)': {
                borderBottom: '1px solid #eceef0',
            },
        },
        highlightOnHoverStyle: {
            backgroundColor: '#f1f4f8',
            outline: 'none',
        },
    },
    cells: {
        style: {
            paddingLeft: '12px',
            paddingRight: '12px',
        },
    },
};

export { tableCustomStyles, compactTableStyles };
