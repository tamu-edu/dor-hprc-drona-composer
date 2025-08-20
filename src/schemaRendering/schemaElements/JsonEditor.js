import React, { useState, useEffect } from 'react';

const JsonEditor = ({ 
  label, 
  name, 
  help, 
  value, 
  onChange, 
  schema, 
  defaultValue, 
  collapsed = false,
  disabled = false 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [jsonValue, setJsonValue] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    try {
      const initialValue = value || defaultValue || {};
      setJsonValue(JSON.stringify(initialValue, null, 2));
      setIsValid(true);
      setError('');
    } catch (err) {
      setError('Invalid JSON format');
      setIsValid(false);
    }
  }, [value, defaultValue]);

  const handleJsonChange = (newValue) => {
    setJsonValue(newValue);
    
    try {
      const parsed = JSON.parse(newValue);
      setError('');
      setIsValid(true);
      if (onChange) {
        onChange(parsed);
      }
    } catch (err) {
      setError(err.message);
      setIsValid(false);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonValue(formatted);
      setError('');
      setIsValid(true);
    } catch (err) {
      setError('Cannot format invalid JSON');
    }
  };


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonValue);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name || 'config'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Cannot download invalid JSON');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const parsed = JSON.parse(content);
          setJsonValue(JSON.stringify(parsed, null, 2));
          setError('');
          setIsValid(true);
          if (onChange) {
            onChange(parsed);
          }
        } catch (err) {
          setError('Invalid JSON file');
          setIsValid(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const generateTemplate = () => {
    if (schema && schema.properties) {
      const template = {};
      Object.keys(schema.properties).forEach(key => {
        const prop = schema.properties[key];
        if (prop.default !== undefined) {
          template[key] = prop.default;
        } else if (prop.type === 'object' && prop.properties) {
          template[key] = {};
          Object.keys(prop.properties).forEach(subKey => {
            const subProp = prop.properties[subKey];
            if (subProp.default !== undefined) {
              template[key][subKey] = subProp.default;
            }
          });
        }
      });
      
      const templateJson = JSON.stringify(template, null, 2);
      setJsonValue(templateJson);
      if (onChange) {
        onChange(template);
      }
      setError('');
      setIsValid(true);
    }
  };

  const getSchemaInfo = () => {
    if (!schema) return null;
    
    const propCount = schema.properties ? Object.keys(schema.properties).length : 0;
    const requiredCount = schema.required ? schema.required.length : 0;
    
    return { propCount, requiredCount };
  };

  const schemaInfo = getSchemaInfo();

  const cardStyle = {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
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

  const badgeStyle = {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  };

  const validBadgeStyle = {
    ...badgeStyle,
    backgroundColor: '#dcfce7',
    color: '#166534'
  };

  const invalidBadgeStyle = {
    ...badgeStyle,
    backgroundColor: '#fee2e2',
    color: '#dc2626'
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
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{label}</h3>
            {schemaInfo && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={validBadgeStyle}>{schemaInfo.propCount} properties</span>
                {schemaInfo.requiredCount > 0 && (
                  <span style={invalidBadgeStyle}>{schemaInfo.requiredCount} required</span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isValid && <span style={invalidBadgeStyle}>Invalid JSON</span>}
            {isValid && <span style={validBadgeStyle}>Valid JSON</span>}
            <span style={{ fontSize: '16px' }}>{isCollapsed ? '▼' : '▲'}</span>
          </div>
        </div>
        {help && (
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>{help}</p>
        )}
      </div>
      
      {!isCollapsed && (
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
              <button
                style={buttonStyle}
                onClick={handleFormat}
                disabled={disabled}
              >
                Format
              </button>
              <button
                style={buttonStyle}
                onClick={handleCopy}
                disabled={disabled}
              >
                Copy
              </button>
              <button
                style={buttonStyle}
                onClick={handleDownload}
                disabled={disabled || !isValid}
              >
               Download
              </button>
              <label style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
                <button
                  style={buttonStyle}
                  disabled={disabled}
                >
                  Upload
                </button>
                {/*<input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={disabled}
                />*/}
              </label>
              {schema && (
                <button
                  style={buttonStyle}
                  onClick={generateTemplate}
                  disabled={disabled}
                >
                  Generate Template
                </button>
              )}
            </div>

            {/* JSON Editor */}
            <div style={{ position: 'relative' }}>
              <textarea
                value={jsonValue}
                onChange={(e) => handleJsonChange(e.target.value)}
                onKeyDown={(e) => {
                  // Allow default behavior for Enter key to create new lines
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                  }
                  // Handle Tab key for indentation
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = e.target.selectionStart;
                    const end = e.target.selectionEnd;
                    const value = e.target.value;
                    const newValue = value.substring(0, start) + '  ' + value.substring(end);
                    e.target.value = newValue;
                    e.target.selectionStart = e.target.selectionEnd = start + 2;
                    handleJsonChange(newValue);
                  }
                }}
                style={{
                  width: '100%',
                  height: '384px',
                  padding: '16px',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '14px',
                  border: isValid ? '1px solid #d1d5db' : '1px solid #ef4444',
                  borderRadius: '6px',
                  resize: 'vertical',
                  backgroundColor: disabled ? '#f3f4f6' : 'white',
                  cursor: disabled ? 'not-allowed' : 'text',
                  outline: 'none',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word'
                }}
                placeholder="Enter JSON configuration..."
                disabled={disabled}
                spellCheck={false}
              />
            </div>

            {/* Error display */}
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                marginTop: '12px'
              }}>
                <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>
                  <strong>JSON Error:</strong> {error}
                </p>
              </div>
            )}

            {/* Schema validation info */}
            {schema && isValid && (
              <div style={{
                padding: '12px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                marginTop: '12px'
              }}>
                <p style={{ fontSize: '14px', color: '#1d4ed8', margin: 0 }}>
                  <strong>Schema Info:</strong> This JSON editor validates against the provided schema.
                  {schemaInfo && (
                    <span>
                      {' '}Contains {schemaInfo.propCount} properties
                      {schemaInfo.requiredCount > 0 && `, ${schemaInfo.requiredCount} required`}.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonEditor;
