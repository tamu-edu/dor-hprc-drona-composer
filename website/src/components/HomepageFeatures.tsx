/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './HomepageFeatures.module.css';

type FeatureItem = {
  title: string;
  image: string;
  to: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Intuitive Workflow Creation',
    image: 'img/drona1.png',
    to: '/docs/user-guide/using-drona',
    description: (
      <>
        Researchers describe their work in a form written for their field. Drona turns it into
        job scripts, so there&apos;s no batch-scheduler syntax to learn.
      </>
    ),
  },
  {
    title: 'Full Transparency and Control',
    image: 'img/drona2.png',
    to: '/docs/user-guide/using-drona#step-2-preview-and-run--the-generated-scripts-window',
    description: (
      <>
        Review and edit every generated script before it runs, add your own files, and follow the
        submission as it happens.
      </>
    ),
  },
  {
    title: 'Workflow Monitoring',
    image: 'img/drona-monitor.svg',
    to: '/docs/using-drona/monitoring',
    description: (
      <>
        Follow running and finished workflows in the same interface: job status, resource usage
        and the results your application produced.
      </>
    ),
  },
  {
    title: 'Extensible Framework',
    image: 'img/drona3.png',
    to: '/docs/tutorial',
    description: (
      <>
        Create, customize, and share scientific workflows using Drona&apos;s flexible framework,
        enabling collaboration and workflow reuse across your research community.
      </>
    ),
  },
];

function Feature({title, image, to, description}: FeatureItem) {
  return (
    <div className={clsx('col col--3', styles.feature)}>
      <Link to={to} className={styles.featureLink}>
        <div className="text--center">
          <img className={styles.featureImage} alt="" src={useBaseUrl(image)} />
        </div>
        <div className="text--center padding-horiz--md">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props) => (
            <Feature key={props.title} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
