// Site footer: one slim bar with the brand, a few key links, GitHub and YouTube icons, and the
// copyright. Replaces Docusaurus's column footer (there are no footer settings in docusaurus.config.js).
import React from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const GITHUB = 'https://github.com/tamu-edu/dor-hprc-drona-composer';
const YOUTUBE = 'https://www.youtube.com/playlist?list=PLet85jxf-0Pk';
const ISSUES = 'https://github.com/tamu-edu/dor-hprc-drona-composer/issues';

const LINKS = [
  { label: 'Docs', to: '/docs/overview/intro' },
  { label: 'Tutorial', to: '/docs/tutorial' },
  { label: 'Environments', to: '/#environments' },
  { label: 'Papers & Talks', to: '/docs/papers-and-talks' },
];

const COPYRIGHT = '© 2024 Texas A&M University High Performance Research Computing · MIT License';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"
      />
    </svg>
  );
}

function Icons() {
  return (
    <div className={styles.icons}>
      <a href={GITHUB} target="_blank" rel="noopener noreferrer" aria-label="Drona on GitHub" title="Drona on GitHub">
        <GitHubIcon />
      </a>
      <a
        href={YOUTUBE}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Drona demo videos on YouTube"
        title="Drona demo videos on YouTube">
        <YouTubeIcon />
      </a>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className={styles.brand}>
      <img src={useBaseUrl('img/drona-icon.png')} alt="" width="28" height="28" />
      <span>Drona Workflow Engine</span>
    </Link>
  );
}

function Links() {
  return (
    <nav className={styles.links} aria-label="Footer">
      {LINKS.map((link) => (
        <Link key={link.label} to={link.to}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.row}>
          <Brand />
          <Links />
          <Icons />
        </div>
        <div className={`${styles.row} ${styles.small}`}>
          <span>{COPYRIGHT}</span>
          <a href={ISSUES} target="_blank" rel="noopener noreferrer">
            Report an issue
          </a>
        </div>
      </div>
    </footer>
  );
}
