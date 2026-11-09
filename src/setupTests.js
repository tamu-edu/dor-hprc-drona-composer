import '@testing-library/jest-dom';

document.body.innerHTML = '<div id="root"></div>';

// jsdom has no matchMedia; react-data-table-component 8 calls it when a table mounts.
window.matchMedia = window.matchMedia || ((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}));
