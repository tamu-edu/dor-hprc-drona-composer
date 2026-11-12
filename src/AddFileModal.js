import React, { useState, useEffect, useCallback } from 'react';
import * as M from './styles/modalStyles';
import { COLORS } from './styles/modalStyles';

// ── Styles ───────────────────────────────────────────────────────────────────

// Compact variant of the shared dialog look (styles/modalStyles.js): 12px rows
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
    backgroundColor: COLORS.maroon, color: 'white', padding: '0 1rem',
    height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerTitle: { fontSize: "var(--drona-text-ui)", fontWeight: "var(--drona-weight-strong)", margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', color: 'white', fontSize: '20px',
    cursor: 'pointer', padding: '0 4px', lineHeight: 1, opacity: 0.8,
  },
  tabBar: {
    display: 'flex', alignItems: 'center', gap: '4px',
    backgroundColor: '#f0f0f0', borderBottom: `1px solid ${COLORS.border}`,
    padding: '0 8px', height: '36px', flexShrink: 0,
  },
  tab: (active) => ({
    padding: '3px 12px', fontSize: "var(--drona-text-caption)", fontWeight: active ? "var(--drona-weight-strong)" : "var(--drona-weight-normal)",
    color: active ? COLORS.maroon : COLORS.muted,
    backgroundColor: active ? 'white' : 'transparent',
    border: `1px solid ${active ? COLORS.border : 'transparent'}`,
    borderRadius: '3px', cursor: 'pointer', lineHeight: '1.2',
  }),
  body: {
    padding: '12px', flexGrow: 1, display: 'flex', flexDirection: 'column',
    minHeight: 0,
  },
  label: { fontSize: "var(--drona-text-caption)", fontWeight: "var(--drona-weight-strong)", color: COLORS.textSecondary, marginBottom: '5px', display: 'block' },
  hint: { ...M.hint, marginBottom: '10px' },
  input: { ...M.textInput, marginBottom: '10px', fontFamily: 'var(--drona-font-mono)' },
  primaryBtn: M.primaryBtn,
  breadcrumb: {
    ...M.bar, padding: '5px 8px', marginBottom: '8px', fontSize: "var(--drona-text-caption)",
    minHeight: 'auto', flexShrink: 0,
  },
  crumbBtn: (isLast) => ({ ...M.crumbBtn(isLast), padding: '1px 3px', fontSize: "var(--drona-text-caption)" }),
  fileList: { ...M.list, maxHeight: 'none', minHeight: 0, flex: 1 },
  entry: (selected, isDir) => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '5px 10px', fontSize: "var(--drona-text-caption)", cursor: 'pointer',
    backgroundColor: selected ? COLORS.rowHover : 'transparent',
    borderBottom: `1px solid ${COLORS.rowDivider}`,
    color: isDir ? COLORS.maroon : '#343a40',
    userSelect: 'none',
  }),
  entryIcon: (isDir) => ({
    fontSize: "var(--drona-text-caption)", opacity: 0.7, flexShrink: 0,
    color: isDir ? COLORS.maroon : COLORS.muted,
    fontWeight: isDir ? "var(--drona-weight-strong)" : "var(--drona-weight-normal)",
    fontFamily: 'var(--drona-font-mono)',
  }),
  empty: { ...M.emptyState, padding: '16px', fontSize: "var(--drona-text-caption)" },
  selectedBar: { ...M.selectedBar, marginTop: '8px', padding: '7px 10px', gap: '10px', flexShrink: 0 },
  selectedPath: { ...M.monoText, fontSize: "var(--drona-text-caption)" },
  errorMsg: { fontSize: "var(--drona-text-caption)", color: COLORS.danger, padding: '6px 0' },
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
  const [selected, setSelected] = useState(null);
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
      <div style={S.breadcrumb}>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.path}>
            {i > 0 && <span style={{ color: COLORS.faint }}>/</span>}
            <button
              style={S.crumbBtn(i === breadcrumbs.length - 1)}
              onClick={() => i < breadcrumbs.length - 1 && navigate(crumb.path)}
            >
              {crumb.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div style={S.fileList}>
        {loading && <div style={S.empty}>Loading…</div>}
        {!loading && error && <div style={{ ...S.empty, color: COLORS.danger }}>{error}</div>}
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
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = COLORS.rowHover}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={S.entryIcon(true)}>▸</span>
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
                  onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.rowHoverNeutral; }}
                  onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={S.entryIcon(false)}>—</span>
                  <span>{file}</span>
                </div>
              );
            })}
          </>
        )}
      </div>

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
          Click to select · double-click to add directly
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
