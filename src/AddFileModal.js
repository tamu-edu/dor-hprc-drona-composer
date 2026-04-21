import React, { useState, useEffect, useCallback } from 'react';

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
  },
  modal: {
    background: 'white', borderRadius: '6px', width: '560px', maxWidth: '95vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
    maxHeight: '80vh', overflow: 'hidden',
  },
  header: {
    backgroundColor: '#500000', color: 'white', padding: '0 1rem',
    height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerTitle: { fontSize: '14px', fontWeight: '600', margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', color: 'white', fontSize: '20px',
    cursor: 'pointer', padding: '0 4px', lineHeight: 1, opacity: 0.8,
  },
  tabBar: {
    display: 'flex', borderBottom: '1px solid #dee2e6',
    backgroundColor: '#f8f9fa', flexShrink: 0,
  },
  tab: (active) => ({
    padding: '8px 20px', fontSize: '13px', fontWeight: active ? '600' : '400',
    color: active ? '#500000' : '#6c757d', background: 'none',
    border: 'none', borderBottom: active ? '2px solid #500000' : '2px solid transparent',
    cursor: 'pointer', transition: 'all 0.15s',
  }),
  body: {
    padding: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column',
    minHeight: 0,
  },
  label: { fontSize: '12px', fontWeight: '600', color: '#495057', marginBottom: '6px', display: 'block' },
  hint: { fontSize: '12px', color: '#6c757d', marginBottom: '12px' },
  input: {
    width: '100%', padding: '7px 10px', fontSize: '13px',
    border: '1px solid #ced4da', borderRadius: '4px',
    outline: 'none', boxSizing: 'border-box', marginBottom: '12px',
    fontFamily: 'monospace',
  },
  primaryBtn: (disabled) => ({
    padding: '6px 16px', fontSize: '13px', fontWeight: '500',
    backgroundColor: disabled ? '#ccc' : '#500000',
    border: 'none', borderRadius: '4px', color: 'white',
    cursor: disabled ? 'default' : 'pointer',
  }),
  breadcrumb: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap',
    gap: '2px', padding: '6px 8px', backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6', borderRadius: '4px', marginBottom: '8px',
    fontSize: '12px', flexShrink: 0,
  },
  crumbBtn: (isLast) => ({
    background: 'none', border: 'none', padding: '1px 3px',
    fontSize: '12px', cursor: isLast ? 'default' : 'pointer',
    color: isLast ? '#495057' : '#500000',
    fontWeight: isLast ? '600' : '400',
    borderRadius: '3px',
  }),
  fileList: {
    border: '1px solid #dee2e6', borderRadius: '4px',
    overflowY: 'auto', flex: 1, minHeight: 0,
  },
  entry: (selected, isDir) => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '6px 10px', fontSize: '13px', cursor: 'pointer',
    backgroundColor: selected ? '#fff0f0' : 'transparent',
    borderBottom: '1px solid #f0f0f0',
    color: isDir ? '#0066cc' : '#212529',
    userSelect: 'none',
  }),
  empty: {
    padding: '16px', textAlign: 'center', fontSize: '13px', color: '#6c757d',
  },
  selectedBar: {
    marginTop: '8px', padding: '8px 10px',
    backgroundColor: '#f8f9fa', border: '1px solid #dee2e6',
    borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px',
    flexShrink: 0,
  },
  selectedPath: {
    fontSize: '12px', color: '#495057', flex: 1,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontFamily: 'monospace',
  },
  errorMsg: { fontSize: '12px', color: '#dc3545', padding: '8px 0' },
};

// ── New File tab ─────────────────────────────────────────────────────────────

const NewFileTab = ({ onAdd }) => {
  const [name, setName] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ name: trimmed, content: '' });
    setName('');
  };

  return (
    <div style={S.body}>
      <span style={S.hint}>
        Creates a blank file that will be written to your job directory on submission.
      </span>
      <label style={S.label}>Filename</label>
      <input
        style={S.input}
        type="text"
        placeholder="e.g. config.sh"
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <div>
        <button style={S.primaryBtn(!name.trim())} disabled={!name.trim()} onClick={handleAdd}>
          Add File
        </button>
      </div>
    </div>
  );
};

// ── Browse Files tab ─────────────────────────────────────────────────────────

const BrowseTab = ({ defaultPath, onAdd, onClose }) => {
  const [currentPath, setCurrentPath] = useState(defaultPath || '/');
  const [entries, setEntries] = useState({ subdirectories: [], subfiles: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // { path, name }
  const [adding, setAdding] = useState(false);

  const fetchEntries = useCallback(async (path) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch(
        `${document.dashboard_url}/jobs/composer/subdirectories?path=${encodeURIComponent(path)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEntries(data);
    } catch (e) {
      setError(e.message);
      setEntries({ subdirectories: [], subfiles: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(currentPath); }, [currentPath, fetchEntries]);

  const navigate = (path) => setCurrentPath(path);

  const joinPath = (base, name) =>
    base === '/' ? `/${name}` : `${base}/${name}`;

  const addFile = async (filePath, fileName) => {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(
        `${document.dashboard_url}/jobs/composer/file_content?path=${encodeURIComponent(filePath)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onAdd({ name: fileName, content: data.content });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  // Build breadcrumb segments
  const breadcrumbs = (() => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ label: '/', path: '/' }];
    let acc = '';
    for (const part of parts) {
      acc += '/' + part;
      crumbs.push({ label: part, path: acc });
    }
    return crumbs;
  })();

  return (
    <div style={{ ...S.body, gap: 0 }}>
      {/* Breadcrumb */}
      <div style={S.breadcrumb}>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.path}>
            {i > 0 && <span style={{ color: '#adb5bd' }}>/</span>}
            <button
              style={S.crumbBtn(i === breadcrumbs.length - 1)}
              onClick={() => i < breadcrumbs.length - 1 && navigate(crumb.path)}
            >
              {crumb.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* File list */}
      <div style={S.fileList}>
        {loading && <div style={S.empty}>Loading…</div>}
        {!loading && error && <div style={{ ...S.empty, color: '#dc3545' }}>{error}</div>}
        {!loading && !error && entries.subdirectories.length === 0 && entries.subfiles.length === 0 && (
          <div style={S.empty}>Empty directory</div>
        )}
        {!loading && !error && (
          <>
            {entries.subdirectories.map((dir) => (
              <div
                key={dir}
                style={S.entry(false, true)}
                onClick={() => navigate(joinPath(currentPath, dir))}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f4ff'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span>📁</span>
                <span>{dir}</span>
              </div>
            ))}
            {entries.subfiles.map((file) => {
              const filePath = joinPath(currentPath, file);
              const isSelected = selected?.path === filePath;
              return (
                <div
                  key={file}
                  style={S.entry(isSelected, false)}
                  onClick={() => setSelected({ path: filePath, name: file })}
                  onDoubleClick={() => addFile(filePath, file)}
                  onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8f8f8'; }}
                  onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span>📄</span>
                  <span>{file}</span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Selected file bar */}
      {selected && (
        <div style={S.selectedBar}>
          <span style={S.selectedPath}>{selected.path}</span>
          <button
            style={S.primaryBtn(adding)}
            disabled={adding}
            onClick={() => addFile(selected.path, selected.name)}
          >
            {adding ? 'Loading…' : 'Add to Job'}
          </button>
        </div>
      )}
      {!selected && (
        <div style={{ ...S.hint, marginTop: '6px', flexShrink: 0 }}>
          Click a file to select, double-click to add directly.
        </div>
      )}
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

const AddFileModal = ({ isOpen, onClose, onAddFile, defaultPath }) => {
  const [tab, setTab] = useState('new');

  const handleAddFile = ({ name, content }) => {
    onAddFile({ name, content });
  };

  if (!isOpen) return null;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <h5 style={S.headerTitle}>Add File to Job</h5>
          <button
            style={S.closeBtn}
            onClick={onClose}
            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
            onMouseOut={(e) => e.currentTarget.style.opacity = 0.8}
          >×</button>
        </div>

        <div style={S.tabBar}>
          <button style={S.tab(tab === 'new')} onClick={() => setTab('new')}>New File</button>
          <button style={S.tab(tab === 'browse')} onClick={() => setTab('browse')}>Browse Files</button>
        </div>

        {tab === 'new'
          ? <NewFileTab onAdd={(f) => { handleAddFile(f); onClose(); }} />
          : <BrowseTab defaultPath={defaultPath} onAdd={handleAddFile} onClose={onClose} />
        }
      </div>
    </div>
  );
};

export default AddFileModal;
