const styles = `
#main-container.container,
.job-composer-container,
.job-composer-container > .card {
  max-width: none !important;
  width: 100% !important;
}

#main-container.container {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.composer-multipane-layout {
  display: flex !important;
  flex-direction: row !important;
  align-items: stretch;
  gap: 1.25rem;
  width: 100%;
  min-height: 0px;
  margin-bottom: 1rem;
}

.composer-filmstrip-pane {
  position: sticky;
  top: 0;
  width: 240px !important;
  min-width: 240px !important;
  height: calc(100vh - 180px);
  max-height: calc(100vh - 180px);
  margin-top: 0;
  align-self: flex-start;
  overflow-y: auto;
  overflow-x: hidden;
  background: #f6f7f9;
  border: 1px solid #d7dbe0;
  border-radius: 12px;
  padding: 0.9rem;
  box-sizing: border-box;

  mask-image: linear-gradient(
    to bottom,
    black 0%,
    black 85%,
    transparent 100%
  );

  -webkit-mask-image: linear-gradient(
    to bottom,
    black 0%,
    black 85%,
    transparent 100%
  );
}

.composer-form-pane {
  flex: 1 1 auto;
  min-width: 0;
}

.env-filmstrip {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.65rem;
  padding-bottom: 2rem;
}

.env-section-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #4b5563;
  margin-top: 0.9rem;
  margin-bottom: 0.35rem;
  letter-spacing: 0.06em;
}

.env-tile {
  width: 100%;
  min-height: 90px;
  display: flex !important;
  align-items: center;
  gap: 1rem;
  border: 1px solid #cbd5e1;
  border-left-width: 5px;
  border-radius: 10px;
  background: white;
  padding: 1rem;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}

.env-tile:hover {
  background: #fff7f7;
  border-color: #500000;
}

.env-tile.selected {
  background: #fff1f1;
  border-color: #500000;
  box-shadow: 0 0 0 3px rgba(80, 0, 0, 0.16);
}

.env-tile.system-env {
  border-left-color: #500000;
}

.env-tile.user-env {
  border-left-color: #337ab7;
}

.env-icon {
  font-size: 2.25rem;
  line-height: 1;
  flex-shrink: 0;
}

.env-name {
  margin-top: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}

.env-tile.user-env .env-name::after {
  content: "User";
  display: block;
  margin-top: 0.25rem;
  font-size: 0.68rem;
  font-weight: 500;
  color: #337ab7;
}

.env-tile.system-env .env-name::after {
  content: "System";
  display: block;
  margin-top: 0.25rem;
  font-size: 0.68rem;
  font-weight: 500;
  color: #500000;
}

.env-add {
  border-style: dashed;
  background: #fafafa;
}

.empty-form-pane {
  padding: 2rem;
  color: #666;
  border: 1px dashed #ccc;
  border-radius: 8px;
}

.env-filmstrip-shell {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.env-search {
  width: 100%;
  margin-bottom: 0.75rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.8rem;
  box-sizing: border-box;
}

.env-search:focus {
  outline: none;
  border-color: #500000;
  box-shadow: 0 0 0 3px rgba(80, 0, 0, 0.12);
}

.env-filmstrip-scroll {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}


.env-empty {
  font-size: 0.8rem;
  color: #6b7280;
  padding: 0.75rem 0.25rem;
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-top: 1rem;
  padding-top: 1rem;

  border-top: 1px solid #ddd;
  background: white;
}

.drona-footer {
  margin-top: 1rem;
  padding-top: 1rem;

  border-top: 1px solid #e5e7eb;

  background: transparent;

  color: #64748b;
  font-size: 0.8rem;
}

.drona-footer-caution {
  margin-bottom: 0.75rem;
}

.drona-footer-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drona-footer-left,
.drona-footer-right {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.drona-footer strong {
  color: #500000;
}

.footer-divider {
  color: #cbd5e1;
}
`;

console.log("JobComposerEnvSplitStyles loaded");

const existingStyle = document.getElementById("job-composer-env-split-styles");

if (existingStyle) {
  existingStyle.innerText = styles;
} else {
  const styleSheet = document.createElement("style");
  styleSheet.id = "job-composer-env-split-styles";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}