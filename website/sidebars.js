/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Overview',
      items: ['overview/intro', 'overview/key-concepts'],
    },
    'setup',
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/using-drona',
        'using-drona/monitoring',
        'environments/user-environments',
      ],
    },
    {
      type: 'category',
      label: 'Build an Environment',
      items: [
        {
          type: 'category',
          label: 'Tutorial',
          link: { type: 'doc', id: 'tutorial/index' },
          items: [
            'tutorial/part-1',
            'tutorial/part-2',
            'tutorial/part-3',
            'tutorial/part-4',
            'tutorial/part-5',
          ],
        },
        'environments/overview',
        'environments/publishing',
      ],
    },
    {
      type: 'category',
      label: 'Drona Runtime Library',
      link: { type: 'doc', id: 'runtime-library/index' },
      items: [
        'runtime-library/form-parts',
        'runtime-library/maps-and-functions',
        'runtime-library/retrievers-and-templates',
        'runtime-library/site-tailoring',
      ],
    },
    {
      type: 'category',
      label: 'Technical Reference',
      items: [
        'overview/architecture',
        'environments/schema',
        'frontend/form-components',
        'environments/conditionals',
        'environments/map',
        'environments/driver',
        'environments/utils',
        'environments/retriever-scripts',
        'environments/live-charts',
        'environments/styling',
        'environments/database',
        'overview/installation',
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      items: ['integrations/open-ondemand'],
    },
    'papers-and-talks',
  ],
};

module.exports = sidebars;
