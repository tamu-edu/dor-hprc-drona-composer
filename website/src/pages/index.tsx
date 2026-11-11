import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';
import useBaseUrl from '@docusaurus/useBaseUrl';
import HomepageFeatures from '../components/HomepageFeatures';
import LiveDemo from '../components/home/LiveDemo';
import {HowItWorks, RuntimeLibrary, GalleryTeaser, GetStarted} from '../components/home/HomeSections';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroHeading}>
          <img className={styles.heroLogo} src={useBaseUrl('img/drona-icon.png')} alt="" />
          <h1 className="hero__title">{siteConfig.title}</h1>
        </div>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary" to="/docs/user-guide/using-drona">
            Generate and submit
          </Link>
          <Link className="button button--secondary" to="/docs/using-drona/monitoring">
            Monitor workflows
          </Link>
          <Link className="button button--secondary" to="/docs/tutorial">
            Build an environment
          </Link>
          <Link className="button button--secondary" to="/docs/setup">
            Set up Drona
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Documentation for Drona Workflow Engine, a framework for creating, running and monitoring scientific workflows on HPC clusters through a web interface.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <HowItWorks />
        <LiveDemo />
        <GalleryTeaser />
        <RuntimeLibrary />
        <GetStarted />
      </main>
    </Layout>
  );
}
