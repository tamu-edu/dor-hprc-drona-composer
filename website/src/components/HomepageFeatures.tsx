/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

type FeatureItem = {
  title: string;
  image: string;
  description: JSX.Element;
  imageStyle?: React.CSSProperties; // Add this line
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Intuitive Workflow Creation',
    image: 'img/drona1.png',
    imageStyle: {
      objectFit: 'cover',
      objectPosition: 'center' ,

      height: '185px',
      width: "200px",

    },
    description: (
      <>
        Drona provides a user-friendly GUI that guides researchers through configuring HPC workflows, eliminating the steep learning curve and allowing you to focus on your research.
      </>
    ),
  },
  {
    title: 'Full Transparency and Control',
    image: 'img/drona2.png',
    imageStyle: {
      objectFit: 'cover',
      objectPosition: 'center bottom' ,
      marginBottom: '10px',

      height: '175px',
      width: "320px",

    },
    description: (
      <>
        Review and edit all generated scripts in an interactive preview window before submission, ensuring complete visibility and control over your scientific workflows.
      </>
    ),
  },
  {
    title: 'Extensible Framework',
    image: 'img/drona3.png',
    imageStyle: {
      objectFit: 'cover',
      objectPosition: 'center' ,

      height: '185px',
      width: "200px",

    },
    description: (
      <>
        Create, customize, and share scientific workflows using Drona&apos;s flexible framework, enabling collaboration and workflow reuse across your research community.
      </>
    ),
  },
];

function Feature({title, image, description, imageStyle}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img 
          className={styles.featureSvg} 
          alt={title} 
          src={image}
          style={imageStyle} // Add this line
        />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
