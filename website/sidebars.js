/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'overview/intro',
        'quick-start',
        'overview/installation',
        'overview/architecture',
      ],
    },
    {
      type: 'category',
      label: 'Using Drona',
      items: [
        'user-guide/using-drona',
        'environments/user-workflows',
        {
          type: 'category',
          label: 'Existing Workflows',
          items: [
            'using-drona/workflows/generic',
            'using-drona/workflows/alphafold',
            'using-drona/workflows/huggingface',
            'using-drona/workflows/lammps',
          ],
        },
        'using-drona/monitoring',
      ],
    },
    {
      type: 'category',
      label: 'Environment Development',
      items: [
        'environments/overview',
        'environments/schema',
        'frontend/form-components',
        'environments/map',
        'environments/driver',
        'environments/utils',
        'environments/publishing',
        'environments/database',
        {
          type: 'category',
          label: 'Advanced Features',
          items: [
            'environments/retriever-scripts',
            'environments/conditionals',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      items: [
        'integrations/open-ondemand',
      ],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials',
        'user-guide/primers',
      ],
    },
    'citations',
  ],
};

module.exports = sidebars;
