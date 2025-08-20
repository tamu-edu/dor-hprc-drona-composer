import React, { useState, useEffect } from 'react';

const DataPreview = ({ 
  label, 
  name, 
  help, 
  datasetId, 
  subset, 
  split = "train",
  limit = 5,
  disabled = false 
}) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchPreview = async () => {
    if (!datasetId) {
      setError('No dataset selected');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        dataset_id: datasetId,
        split: split,
        limit: limit.toString()
      });

      if (subset) {
        params.append('subset', subset);
      }

      const response = await fetch(`/api/retrievers/preview_dataset?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data);
        setError('');
      } else {
        setError(data.error || 'Failed to load dataset preview');
        setPreviewData(null);
      }
    } catch (err) {
      setError(`Error loading preview: ${err.message}`);
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when datasetId changes
  useEffect(() => {
    if (datasetId) {
      fetchPreview();
    } else {
      setPreviewData(null);
      setError('');
    }
  }, [datasetId, subset, split]);

  const renderSampleTable = () => {
    if (!previewData || !previewData.samples || previewData.samples.length === 0) {
      return null;
    }

    const columns = previewData.columns || [];
    const samples = previewData.samples;

    return (
      <div style={{ marginTop: '12px' }}>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '8px 12px', 
          borderRadius: '4px 4px 0 0',
          border: '1px solid #dee2e6',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          Dataset: {previewData.dataset_id} {previewData.subset && `(${previewData.subset})`}
          <span style={{ marginLeft: '12px', fontWeight: '400', color: '#6c757d' }}>
            {previewData.dataset_size} samples total
          </span>
        </div>
        
        <div style={{ 
          overflowX: 'auto',
          border: '1px solid #dee2e6',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th style={{ 
                  padding: '8px 12px', 
                  textAlign: 'left',
                  borderBottom: '1px solid #dee2e6',
                  fontWeight: '600',
                  minWidth: '40px'
                }}>
                  #
                </th>
                {columns.map((col, index) => (
                  <th key={index} style={{ 
                    padding: '8px 12px', 
                    textAlign: 'left',
                    borderBottom: '1px solid #dee2e6',
                    fontWeight: '600',
                    minWidth: '120px'
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {samples.map((sample, rowIndex) => (
                <tr key={rowIndex} style={{ 
                  backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f8f9fa' 
                }}>
                  <td style={{ 
                    padding: '8px 12px', 
                    borderBottom: '1px solid #dee2e6',
                    fontWeight: '500',
                    color: '#6c757d'
                  }}>
                    {rowIndex + 1}
                  </td>
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} style={{ 
                      padding: '8px 12px', 
                      borderBottom: '1px solid #dee2e6',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatCellValue(sample[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined) {
      return <span style={{ color: '#6c757d', fontStyle: 'italic' }}>null</span>;
    }
    
    if (typeof value === 'string') {
      return value.length > 100 ? value.substring(0, 100) + '...' : value;
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '');
    }
    
    return String(value);
  };

  const cardStyle = {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    marginTop: '12px'
  };

  const headerStyle = {
    padding: '16px',
    borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
    cursor: 'pointer',
    backgroundColor: isCollapsed ? 'transparent' : '#f8fafc',
    borderRadius: isCollapsed ? '8px' : '8px 8px 0 0',
    transition: 'background-color 0.2s'
  };

  const titleStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 0
  };

  const buttonStyle = {
    padding: '6px 12px',
    margin: '2px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    opacity: disabled ? 0.5 : 1
  };

  return (
    <div style={cardStyle}>
      <div 
        style={headerStyle}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div style={titleStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{label}</h3>
            {loading && <span style={{ fontSize: '14px', color: '#6c757d' }}>Loading...</span>}
          </div>
          <span style={{ fontSize: '16px' }}>{isCollapsed ? '▼' : '▲'}</span>
        </div>
        {help && (
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>{help}</p>
        )}
      </div>
      
      {!isCollapsed && (
        <div style={{ padding: '16px' }}>
          {!datasetId && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              Select a dataset to see preview
            </div>
          )}

          {loading && (
            <div style={{
              padding: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              color: '#1d4ed8',
              textAlign: 'center'
            }}>
              Loading dataset preview...
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {previewData && !loading && !error && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <button
                  style={buttonStyle}
                  onClick={fetchPreview}
                  disabled={disabled || loading}
                >
                  🔄 Refresh Preview
                </button>
              </div>
              
              {renderSampleTable()}
              
              {previewData.columns && previewData.columns.length > 0 && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #90caf9',
                  borderRadius: '6px',
                  marginTop: '12px'
                }}>
                  <strong>💡 Available Columns:</strong> {previewData.columns.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataPreview;