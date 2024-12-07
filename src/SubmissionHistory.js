import React, { useState } from 'react';

const SubmissionHistory = ({ isExpanded }) => {
  const submissions = [
    { id: 1, name: 'Test Job 1', submitted: '2024-03-15 14:30', status: 'completed' },
    { id: 2, name: 'Analysis Job', submitted: '2024-03-14 09:15', status: 'failed' },
    { id: 3, name: 'Data Process', submitted: '2024-03-13 16:45', status: 'running' }
  ];

  if (!isExpanded) return null;

  return (
    <div className="mt-4">
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(submission => (
              <tr key={submission.id}>
                <td>{submission.name}</td>
                <td>{submission.submitted}</td>
                <td>
                  <span className={`badge bg-${submission.status === 'completed' ? 'success' : submission.status === 'failed' ? 'danger' : 'primary'}`}>
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-link">View</button>
                  <button className="btn btn-sm btn-link">Resubmit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


export default SubmissionHistory;
