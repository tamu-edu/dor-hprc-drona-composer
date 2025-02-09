const tableCustomStyles = {
    headCells: {
        style: {
            fontSize: '16px',
            fontWeight: 'bold',
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
            fontSize: '16px',
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

export { tableCustomStyles };
