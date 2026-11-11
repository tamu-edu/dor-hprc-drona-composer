// Navbar menu to pick the site's colour scheme. The schemes are CSS in src/css/color-schemes.css,
// applied through the data-scheme attribute on <html>. The choice is kept in localStorage, and a
// script in the page head (docusaurus.config.js, headTags) applies it before the page is drawn, so
// a saved scheme doesn't flash the default colours first.
import React, { useEffect, useRef, useState } from 'react';

// id, name, and the two colours shown in its swatch (main colour, accent)
export const SCHEMES = [
  { id: 'maroon', label: 'Maroon', colors: ['#500000', '#fce300'] },
  { id: 'indigo', label: 'Supercomputer', colors: ['#3b3fb6', '#22d3ee'] },
  { id: 'teal', label: 'Lab Notebook', colors: ['#0f5e66', '#f2a93b'] },
  { id: 'saffron', label: 'Drona', colors: ['#c2410c', '#2b2f36'] },
];
const DEFAULT = 'maroon';
export const STORAGE_KEY = 'drona-color-scheme';

function applyScheme(id) {
  const root = document.documentElement;
  if (id === DEFAULT) root.removeAttribute('data-scheme');
  else root.setAttribute('data-scheme', id);
}

function PaletteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
      />
    </svg>
  );
}

export default function SchemePicker({ mobile }) {
  const [scheme, setScheme] = useState(DEFAULT);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // The head script may already have applied a saved scheme; show that one as chosen
  useEffect(() => {
    setScheme(document.documentElement.getAttribute('data-scheme') || DEFAULT);
  }, []);

  // Close the menu on a click outside it or on Escape
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (id) => {
    setScheme(id);
    applyScheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (error) {
      // Storage may be blocked; the scheme then lasts until the page is reloaded
    }
    setOpen(false);
  };

  const options = SCHEMES.map((option) => (
    <li key={option.id}>
      <button
        type="button"
        role="menuitemradio"
        aria-checked={option.id === scheme}
        className="clean-btn scheme-picker__option"
        onClick={() => choose(option.id)}>
        <span
          className="scheme-picker__swatch"
          style={{ background: `linear-gradient(135deg, ${option.colors[0]} 55%, ${option.colors[1]} 55%)` }}
        />
        {option.label}
      </button>
    </li>
  ));

  if (mobile) {
    return (
      <li className="menu__list-item">
        <div className="scheme-picker--mobile">
          <div className="scheme-picker__heading">Colour scheme</div>
          <ul role="menu" aria-label="Colour scheme">
            {options}
          </ul>
        </div>
      </li>
    );
  }

  return (
    <div className="navbar__item scheme-picker" ref={ref}>
      <button
        type="button"
        className="clean-btn scheme-picker__button"
        aria-label="Colour scheme"
        title="Colour scheme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}>
        <PaletteIcon />
      </button>
      {open && (
        <ul className="scheme-picker__menu" role="menu" aria-label="Colour scheme">
          <li className="scheme-picker__heading" role="presentation">
            Colour scheme
          </li>
          {options}
        </ul>
      )}
    </div>
  );
}
