// Homepage sections below the feature cards: how Drona works, a few example environments, the
// runtime library, and a closing row of starting points.
import React from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import environments from '@site/src/data/environments';
import styles from './home.module.css';

const STEPS = [
  {
    title: 'Fill in a form made for your science',
    text: 'Each environment asks the questions its workflow needs, in the words of its field.',
    image: 'img/user-guide/create-form.png',
    to: '/docs/user-guide/using-drona#step-1-create--the-input-form',
  },
  {
    title: 'Review the scripts, then run',
    text: 'Drona writes every script and shows it before anything is submitted. Edit what you like.',
    image: 'img/user-guide/generated-scripts.png',
    to: '/docs/user-guide/using-drona#step-2-preview-and-run--the-generated-scripts-window',
  },
  {
    title: 'Follow your workflows and results',
    text: 'Job states, resource use and the results themselves, in the same place you started.',
    image: 'img/user-guide/monitor.png',
    to: '/docs/using-drona/monitoring',
  },
];

export function HowItWorks() {
  return (
    <section className={`${styles.section} ${styles.sectionTinted}`}>
      <div className="container">
        <h2 className={styles.sectionTitle}>From Question to Results in Three Steps</h2>
        <div className={styles.steps}>
          {STEPS.map((step, index) => (
            <Link key={step.title} to={step.to} className={styles.step}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <img className={styles.stepImage} src={useBaseUrl(step.image)} alt="" loading="lazy" />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const LIBRARY = [
  { title: 'Reusable form components', text: 'Common inputs every environment needs, ready to drop into any form.' },
  { title: 'Scheduler integration', text: 'Resource requests checked against the cluster and turned into a valid job script.' },
  { title: 'Built-in monitoring', text: 'Follow, inspect and manage submitted workflows without extra code.' },
  { title: 'Shared helpers', text: 'Utilities any environment can call to validate input and fill in values.' },
];

export function RuntimeLibrary() {
  return (
    <section className={styles.library}>
      <div className="container">
        <div className={styles.libraryIntro}>
          <span className={styles.libraryKicker}>Batteries included</span>
          <h2>The Drona Runtime Library</h2>
          <p>
            Environment authors focus on what is unique to their workflow. The common building blocks
            come ready-made and shared across environments.
          </p>
          <Link className="button button--secondary button--lg" to="/docs/runtime-library">
            Explore the library
          </Link>
        </div>
        <div className={styles.libraryGrid}>
          {LIBRARY.map((item) => (
            <div key={item.title} className={styles.libraryItem}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EnvironmentIcon({ env, size = 48 }) {
  const src = useBaseUrl(env.icon || '');
  if (env.icon) {
    return <img className={styles.envIcon} src={src} alt="" width={size} height={size} loading="lazy" />;
  }
  const initials = env.name.replace(/[^A-Z]/g, '').slice(0, 2) || env.name.slice(0, 2).toUpperCase();
  return (
    <span className={styles.envInitials} style={{ width: size, height: size }} aria-hidden="true">
      {initials}
    </span>
  );
}

// A few examples of what environments cover. The navbar and footer link here (/#environments).
const EXAMPLES = ['AlphaFold', 'LAMMPS', 'PyTorch-Lightning', 'MATLAB', 'Python', 'tamulauncher'];

export function GalleryTeaser() {
  // Register the section's anchor, so the build's link check knows /#environments exists
  useBrokenLinks().collectAnchor('environments');
  const examples = EXAMPLES.map((name) => environments.find((env) => env.name === name)).filter(Boolean);
  return (
    <section id="environments" className={`${styles.section} ${styles.sectionTinted}`}>
      <div className="container text--center">
        <h2 className={styles.sectionTitle}>Environments for Real Science</h2>
        <p className={styles.sectionLead}>
          From protein structure prediction and molecular dynamics to machine learning, environments turn
          real research workflows into forms. A few examples:
        </p>
        <div className={styles.teaserIcons}>
          {examples.map((env) => (
            <div key={env.name} className={styles.teaserIcon} title={env.description}>
              <EnvironmentIcon env={env} size={56} />
              <span>{env.name}</span>
            </div>
          ))}
        </div>
        <div className={styles.contribute}>
          <h3>Built a Workflow Others Could Use?</h3>
          <p>
            Share it. Researchers can contribute the environments they build to Drona's environment
            repository, so every site that uses it can offer them to their users.
          </p>
          <div className={styles.contributeButtons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/environments/publishing#contributing-to-the-drona-environment-repository">
              Contribute an environment
            </Link>
            <Link className="button button--outline button--primary button--lg" to="/docs/tutorial">
              Build your own
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Closing row: one starting point per kind of visitor, the same paths as "Where to Go Next" in
// the introduction. It also keeps the dark runtime library band from running into the footer.
const PATHS = [
  { label: 'Run Workflows', to: '/docs/user-guide/using-drona' },
  { label: 'Build an Environment', to: '/docs/tutorial' },
  { label: 'Install Drona', to: '/docs/setup' },
];

export function GetStarted() {
  return (
    <section className={styles.getStarted}>
      <div className="container">
        <h2>Where Would You Like to Start?</h2>
        <div className={styles.getStartedButtons}>
          {PATHS.map((path) => (
            <Link key={path.to} className="button button--outline button--primary button--lg" to={path.to}>
              {path.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
