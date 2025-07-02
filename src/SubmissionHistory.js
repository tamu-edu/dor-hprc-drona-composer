import React, { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';
import { tableCustomStyles } from './tablestyle.jsx';

const SubmissionHistory = ({ isExpanded, handleRerun, handleForm }) => {
  const [jobHistory, setJobHistory] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState('__none__');
  const [filteredData, setFilteredData] = useState([]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setOpenDropdownId('__none__');
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      const currentDate = new Date();
      const defaultEndDate = currentDate.toISOString().split('T')[0];
      currentDate.setDate(currentDate.getDate() - 30);
      const defaultStartDate = currentDate.toISOString().split('T')[0];

      setStartDate(defaultStartDate);
      setEndDate(defaultEndDate);

      fetchJobHistory();
    }
  }, [isExpanded]);

  const fetchJobHistory = async () => {
    try {
      const response = await fetch(`${document.dashboard_url}/jobs/composer/history`);
      const data = await response.json();
      
      const processedData = data.map((job, index) => ({
        ...job,
        _rowId: `${index}`
      }));
      
      setJobHistory(processedData);
    } catch (error) {
      console.error('Failed to fetch job history:', error);
    }
  };


  useEffect(() => {
    const sorted = [...jobHistory].sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    setFilteredData(sorted);
  }, [jobHistory]);


  const columns = [
    {
      name: 'ID',
      selector: row => row.job_id || 'N/A',
      sortable: true,
      width: '100px',
    },
    {
      name: 'Name',
      selector: row => row.name || 'N/A',
      sortable: true,
      width: '200px',
      cell: row => {
        const name = row.name || 'N/A';
        return (
          <div className="text-truncate" style={{ maxWidth: '180px' }}>
            <span title={name}>{name}</span>
          </div>
        );
      },
    },
    {
      name: 'Location',
      selector: row => row.location || 'N/A',
      sortable: true,
      width: '300px',
      cell: row => {
        const location = row.location || 'N/A';
        const diskName = location.split('/');
        const displayedName = diskName.length > 3 ? diskName.slice(-3).join('/') : location;
        return (
          <div className="text-truncate" style={{ maxWidth: '280px' }}>
            <a
              target="_blank"
              style={{ color: '#003C71', fontWeight: 'bold', textDecoration: 'underline' }}
              href={document.file_app_url + row.location}
              title={location}
            >
              {displayedName}
            </a>
          </div>
        );
      },
    },
    {
      name: 'Environment',
      selector: row => row.runtime || 'N/A',
      sortable: true,
      width: '150px',
      cell: row => {
        const environment = row.runtime || 'N/A';
        return (
          <div className="text-truncate" style={{ maxWidth: '130px' }}>
            <span title={environment}>{environment}</span>
          </div>
        );
      },
    },
    {
      name: 'Date',
      selector: row => row.timestamp || 'N/A',
      sortable: true,
      width: '150px',
      cell: row => {
        if (!row.timestamp) return 'N/A';
        const date = new Date(row.timestamp);
        const datePart = date.toISOString().split('T')[0];
        const timePart = date.toTimeString().split(' ')[0];
        return (
          <div>
            <div>{datePart}</div>
            <div className="text-muted">{timePart}</div>
          </div>
        );
      },
    },
    {
      name: 'Actions',
      width: '100px',
      cell: row => {
        return (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div className="dropdown">
              <button
                className={`btn btn-sm btn-primary maroon-button dropdown-toggle ${openDropdownId === row._rowId ? 'show' : ''}`}
                type="button"
                onClick={() => setOpenDropdownId(openDropdownId === row._rowId ? '__none__' : row._rowId)}
                aria-expanded={openDropdownId === row._rowId}
              >
                Actions
              </button>
              <ul className={`dropdown-menu ${openDropdownId === row._rowId ? 'show' : ''}`} style={{ minWidth: '120px' }}>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      handleRerun(row);
                      setOpenDropdownId('__none__');
                    }}
                  >
                    Rerun
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      window.scrollTo(0, 90);
                      handleForm(row);
                      setOpenDropdownId('__none__');
                    }}
                  >
                    Recreate
                  </button>
                </li>
              </ul>
            </div>
          </div>
        );
      },
      ignoreRowClick: true,
  }
  ];


  const handleFilter = () => {
    const filtered = jobHistory.filter(job => {
      if (!job.timestamp || !startDate || !endDate) return true;
      const jobDate = new Date(job.timestamp);

      const startDateObj = new Date(startDate);
      startDateObj.setHours(23, 59, 59, 999);

      const endDateObj = new Date(endDate );
      endDateObj.setDate(endDateObj.getDate() + 1);
      endDateObj.setHours(23, 59, 59, 999);
      return jobDate >= startDateObj && jobDate <= endDateObj;
    });
    const sortedFiltered = [...filtered].sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setFilteredData(sortedFiltered);

  };



  if (!isExpanded) return null;

  return (
    <div
      className="mt-4 p-4 rounded"
      style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}
    >
    <h5 className="mb-3" style={{ fontWeight: '600' }}>Job Submission History</h5>
      <div className="date-inputs mb-3">
        <label htmlFor="startDate">From</label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mx-2"
        />
        <label htmlFor="endDate">To</label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="mx-2"
        />
        <button
          className="btn btn-primary maroon-button"
          onClick={handleFilter}
        >
         Filter
        </button>
      </div>

      <div style={{ overflowX: 'auto'}}>
        <DataTable
          columns={columns}
          data={filteredData}
          customStyles={tableCustomStyles}
          responsive
          pagination
          noDataComponent="No jobs have been submitted yet."
              sortIcon={
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        style={{ marginLeft: '4px' }}
      >
        <path d="M6 9L2 5h8L6 9z"/>
      </svg>
  }
      />
    </div>
  </div>
  );
};

export default SubmissionHistory;
