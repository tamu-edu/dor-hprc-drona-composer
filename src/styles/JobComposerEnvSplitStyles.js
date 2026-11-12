import "./tokens";

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

.composer-form-pane {
  flex: 1 1 auto;
  min-width: 0;
}

/* App bar: Drona (home) › environment switcher ............ Import · Help */
.drona-appbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  background: #fff;
  border: 1px solid #ddd6c8;
  border-radius: 10px;
}

.drona-appbar-home {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  background: none;
  padding: 0.25rem 0.45rem;
  border-radius: 6px;
  font-weight: var(--drona-weight-strong);
  font-size: var(--drona-text-ui);
  color: #500000;
  cursor: pointer;
}

.drona-appbar-home-icon { font-size: var(--drona-text-body); line-height: 1; }

.drona-appbar-home:hover { background: #fff1f1; }

.drona-appbar-sep { color: #9ca3af; font-size: var(--drona-text-body); }

.drona-appbar-spacer { flex: 1; }

.drona-appbar-link {
  border: none;
  background: none;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  font-size: var(--drona-text-ui);
  font-weight: var(--drona-weight-strong);
  color: #4b5563;
  cursor: pointer;
  text-decoration: none;
}

.drona-appbar-link:hover { color: #500000; background: #fff1f1; text-decoration: none; }

.drona-appbar button:focus-visible,
.drona-appbar a:focus-visible {
  outline: 2px solid #500000;
  outline-offset: 2px;
}

/* Environment switcher: button + menu over the page */
.env-switch { position: relative; }

.env-switch-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.65rem 0.3rem 0.4rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  font-weight: var(--drona-weight-strong);
  font-size: var(--drona-text-ui);
  color: #111827;
  cursor: pointer;
}

.env-switch-button:hover,
.env-switch-button.open {
  border-color: #500000;
  box-shadow: 0 0 0 3px rgba(80, 0, 0, 0.12);
}


.env-switch-caret { color: #6b7280; font-size: var(--drona-text-caption); }

.env-switch-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
  flex-shrink: 0;
}

.env-switch-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 1030; /* above the sticky Generate bar, below Bootstrap modals */
  width: 340px;
  max-width: calc(100vw - 2rem);
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  box-shadow: 0 18px 40px -16px rgba(30, 20, 10, 0.45);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.env-switch-search {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  font-size: var(--drona-text-ui);
}

.env-switch-search:focus {
  outline: none;
  border-color: #500000;
  box-shadow: 0 0 0 3px rgba(80, 0, 0, 0.12);
}

.env-switch-list {
  max-height: min(60vh, 420px);
  overflow-y: auto;
}

.env-switch-group {
  padding: 0.45rem 0.4rem 0.2rem;
  font-size: var(--drona-text-caption);
  font-weight: var(--drona-weight-strong);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #6b7280;
}

.env-switch-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.35rem 0.45rem;
  border-radius: 7px;
  font-size: var(--drona-text-ui);
  cursor: pointer;
}

.env-switch-item.active { background: #f3f4f6; }
.env-switch-item.selected { font-weight: var(--drona-weight-strong); }
.env-switch-item.selected.active,
.env-switch-item.selected { background: #fff1f1; }

.env-switch-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.env-switch-tag {
  font-size: var(--drona-text-caption);
  font-weight: var(--drona-weight-strong);
  color: #337ab7;
  border: 1px solid #bfd3ea;
  border-radius: 999px;
  padding: 0 0.4rem;
}

.env-switch-check { color: #500000; font-weight: var(--drona-weight-strong); }

.env-switch-remove {
  border: none;
  background: none;
  padding: 0 0.25rem;
  font-size: var(--drona-text-caption);
  color: #9f1239;
  cursor: pointer;
  visibility: hidden;
}

.env-switch-item:hover .env-switch-remove,
.env-switch-item.active .env-switch-remove,
.env-switch-remove:focus-visible { visibility: visible; }

.env-switch-empty { padding: 0.6rem 0.45rem; font-size: var(--drona-text-data); color: #6b7280; }

.env-switch-foot + .env-switch-foot { border-top: none; padding-top: 0.2rem; }

.env-switch-foot.secondary { font-weight: var(--drona-weight-normal); color: #4b5563; }

.env-switch-foot {
  border: none;
  border-top: 1px solid #eee7da;
  background: none;
  text-align: left;
  padding: 0.5rem 0.45rem 0.2rem;
  font-size: var(--drona-text-ui);
  font-weight: var(--drona-weight-strong);
  color: #500000;
  cursor: pointer;
}

.empty-form-pane {
  padding: 2rem;
  color: #666;
  border: 1px dashed #ccc;
  border-radius: 8px;
}

/* Start page (no environment selected): search, recent, A-Z cards with category + description */
.start-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.start-head {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.start-title {
  margin: 0;
  font-size: var(--drona-text-heading);
  font-weight: var(--drona-weight-strong);
  color: #111827;
  flex: 1 1 auto;
}

.start-search {
  flex: 0 1 380px;
  min-width: 220px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: var(--drona-text-ui);
}

.start-search:focus {
  outline: none;
  border-color: #500000;
  box-shadow: 0 0 0 3px rgba(80, 0, 0, 0.12);
}

.start-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.9rem;
}

.start-card {
  position: relative;
  display: flex;
  background: #fff;
  border: 1px solid #ddd6c8;
  border-left: 4px solid #500000;
  border-radius: 10px;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}

.start-card.user { border-left-color: #337ab7; }

.start-card:hover,
.start-card:focus-within {
  border-color: #500000;
  box-shadow: 0 6px 16px -10px rgba(80, 0, 0, 0.5);
}

.start-card-open,
.start-card-import {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.85rem 0.95rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
}

.start-card-open:focus-visible,
.start-card-import:focus-visible,
.start-card-remove:focus-visible {
  outline: 2px solid #500000;
  outline-offset: 2px;
}

.start-card-top { display: flex; align-items: center; gap: 0.65rem; }

.start-card-icon { width: 40px; height: 40px; object-fit: contain; flex-shrink: 0; }

.start-card-name {
  font-weight: var(--drona-weight-strong);
  font-size: var(--drona-text-body);
  color: #111827;
  overflow-wrap: anywhere;
}

.start-card-tags { display: flex; gap: 0.35rem; flex-wrap: wrap; min-height: 1.1rem; }

.start-tag {
  font-size: var(--drona-text-caption);
  font-weight: var(--drona-weight-strong);
  color: #500000;
  background: #fff1f1;
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
}

.start-tag.user { color: #337ab7; background: #eef4fb; }

.start-card-desc {
  font-size: var(--drona-text-data);
  line-height: 1.4;
  color: #4b5563;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.start-card-desc.none { color: #9ca3af; font-style: italic; }

.start-card-remove {
  position: absolute;
  top: 0.45rem;
  right: 0.5rem;
  border: none;
  background: none;
  font-size: var(--drona-text-caption);
  color: #9f1239;
  cursor: pointer;
  opacity: 0;
}

.start-card:hover .start-card-remove,
.start-card-remove:focus-visible { opacity: 1; }

.start-card-import {
  border: 1px dashed #b9b1a1;
  background: #fafaf7;
  border-left: 4px dashed #b9b1a1;
  justify-content: center;
}

.start-import-plus { font-size: 1.6rem; line-height: 1; color: #500000; }

.start-empty { color: #6b7280; margin: 0; }

.start-workflows {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.5rem;
  padding: 0.85rem 1rem 0.9rem;
  background: #f7f4ed;
  border: 1px solid #e5dfd2;
  border-radius: 10px;
}

.start-section-title {
  margin: 0;
  font-size: var(--drona-text-body);
  font-weight: var(--drona-weight-strong);
  color: #111827;
}

.start-wf-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }

.start-wf {
  width: 100%;
  display: grid;
  grid-template-columns: 24px minmax(0, 1.4fr) minmax(0, 1fr) 7.5rem 6rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid #ddd6c8;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  font-size: var(--drona-text-data);
  cursor: pointer;
}

.start-wf:hover { border-color: #500000; background: #fff7f7; }

.start-wf:focus-visible { outline: 2px solid #500000; outline-offset: 2px; }

.start-wf-icon { width: 22px; height: 22px; object-fit: contain; }

.start-wf-all {
  align-self: flex-start;
  border: none;
  background: none;
  padding: 0.2rem 0.25rem;
  font-size: var(--drona-text-ui);
  font-weight: var(--drona-weight-strong);
  color: #500000;
  cursor: pointer;
  border-radius: 6px;
}

.start-wf-all:hover { background: #fff1f1; }

.start-wf-all:focus-visible { outline: 2px solid #500000; outline-offset: 2px; }

.start-wf-name { font-weight: var(--drona-weight-strong); color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.start-wf-env { color: #4b5563; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.start-wf-when { color: #6b7280; text-align: right; font-variant-numeric: tabular-nums; }

.start-wf-state {
  justify-self: start;
  font-size: var(--drona-text-caption);
  font-weight: var(--drona-weight-strong);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
  background: #f3f4f6;
  color: #4b5563;
}

.start-wf-state.running { background: #dcfce7; color: #166534; }
.start-wf-state.pending { background: #fef9c3; color: #854d0e; }
.start-wf-state.completed { background: #e7e5e4; color: #44403c; }
.start-wf-state.failed { background: #ffe4e6; color: #9f1239; }
.start-wf-state.cancelled { background: #f3f4f6; color: #6b7280; }
.start-wf-state.unknown { background: none; color: #9ca3af; }

@media (max-width: 640px) {
  .start-wf { grid-template-columns: 24px minmax(0, 1fr) auto; }
  .start-wf-env, .start-wf-when { display: none; }
}

/* The Generate bar stays visible at the bottom while a long form scrolls. It keeps its
   place at the end of the form, so it never covers the last field. Low z-index: select
   menus (portaled, z-index 9999) and field popups open over it. */
.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;

  position: sticky;
  bottom: 0;
  z-index: 3;

  margin-top: 1rem;
  padding: 0.6rem 0;

  border-top: 1px solid #ddd;
  background: white;
  box-shadow: 0 -4px 8px -6px rgba(0, 0, 0, 0.18);
}

/* Generate: the form's main action, so the only filled button in the form (the others use
   the outlined .maroon-button). */
.composer-generate-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.4rem;
  font-size: var(--drona-text-body);
  font-weight: var(--drona-weight-strong);
  color: #fff;
  background-color: #500000;
  border: 1px solid #500000;
  border-radius: 8px !important;
  box-shadow: 0 2px 6px rgba(80, 0, 0, 0.35);
  transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.composer-generate-button:hover,
.composer-generate-button:focus {
  color: #fff;
  background-color: #6b0f0f;
  border-color: #6b0f0f;
  box-shadow: 0 4px 12px rgba(80, 0, 0, 0.45);
  transform: translateY(-1px);
}

.composer-generate-button:focus-visible {
  outline: 2px solid #500000;
  outline-offset: 2px;
}

.composer-generate-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(80, 0, 0, 0.35);
}

.composer-generate-arrow {
  transition: transform 0.15s ease;
}

.composer-generate-button:hover .composer-generate-arrow {
  transform: translateX(3px);
}

/* Run in the preview window: same look as Generate; when the preview was already run it is
   greyed out and its text says why (SplitScreenModal runButtonState). */
.composer-run-button {
  font-size: var(--drona-text-ui);
  padding: 0.35rem 1.1rem;
}

.composer-generate-button:disabled,
.composer-generate-button:disabled:hover {
  color: #6b7280;
  background-color: #e5e7eb;
  border-color: #d1d5db;
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
  opacity: 1;
}

/* Run in the fullscreen header (maroon bar): light button, greyed when disabled. */
.ide-run-button {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.95);
  color: #500000;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--drona-text-caption);
  font-weight: var(--drona-weight-strong);
  padding: 3px 12px;
  line-height: 1.4;
}

.ide-run-button:hover {
  background: #fff;
}

.ide-run-button:disabled,
.ide-run-button:disabled:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.6);
  cursor: not-allowed;
}

/* Keyboard focus and scroll-to-field keep fields clear of the sticky bar (the page is the
   scroller). */
html {
  scroll-padding-bottom: 4.5rem;
}

.drona-footer {
  margin-top: 1rem;
  padding-top: 1rem;

  border-top: 1px solid #e5e7eb;

  background: transparent;

  color: #64748b;
  font-size: var(--drona-text-caption);
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
