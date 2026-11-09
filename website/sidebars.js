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
        {
          type: 'category',
          label: 'Available Environments',
          items: ['using-drona/workflows/generic'],
        },
        'user-guide/primers',
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
            'tutorial/part-6',
          ],
        },
        'environments/overview',
        'environments/publishing',
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
        'environments/shared-library',
        'environments/database',
        'overview/installation',
        'integrations/open-ondemand',
      ],
    },
    'citations',
    {
      type: 'category',
      label: 'OLD DOCS',
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Getting Started',
          items: [
            'old-docs/overview/intro',
            'old-docs/quick-start',
            'old-docs/overview/installation',
            'old-docs/overview/architecture',
          ],
        },
        {
          type: 'category',
          label: 'Using Drona',
          items: [
            'old-docs/user-guide/using-drona',
            'old-docs/environments/user-workflows',
            {
              type: 'category',
              label: 'Existing Workflows',
              items: [
                'old-docs/using-drona/workflows/generic',
                'old-docs/using-drona/workflows/alphafold',
                'old-docs/using-drona/workflows/huggingface',
                'old-docs/using-drona/workflows/lammps',
              ],
            },
            'old-docs/using-drona/monitoring',
          ],
        },
        {
          type: 'category',
          label: 'Environment Development',
          items: [
            'old-docs/environments/overview',
            'old-docs/environments/schema',
            'old-docs/frontend/form-components',
            'old-docs/environments/shared-library',
            'old-docs/environments/map',
            'old-docs/environments/driver',
            'old-docs/environments/utils',
            'old-docs/environments/publishing',
            'old-docs/environments/database',
            {
              type: 'category',
              label: 'Advanced Features',
              items: [
                'old-docs/environments/retriever-scripts',
                'old-docs/environments/conditionals',
                'old-docs/environments/live-charts',
                'old-docs/environments/styling',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Integrations',
          items: [
            'old-docs/integrations/open-ondemand',
          ],
        },
        {
          type: 'category',
          label: 'Tutorials',
          items: [
            'old-docs/tutorials',
            'old-docs/user-guide/primers',
          ],
        },
        {
          type: 'category',
          label: 'Not in the Old Sidebar',
          items: [
            'old-docs/overview/getting-started',
            'old-docs/frontend/overview',
          ],
        },
        'old-docs/citations',
      ],
    },
  ],
};

module.exports = sidebars;
