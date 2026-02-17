const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(module.exports = {
  title: 'Drona Workflow Engine',
  tagline: 'High Performance Computing Workflow Composer Documentation',
  url: 'https://tamu-edu.github.io',
  baseUrl: '/dor-hprc-drona-composer/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/hprc_tungsten.png',
  organizationName: 'tamu-edu',
  projectName: 'dor-hprc-drona-composer',
  deploymentBranch: 'master',
  trailingSlash: false,

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/tamu-edu/dor-hprc-drona-composer/edit/master/website/',
        },
        blog: {
          showReadingTime: true,
          editUrl:
            'https://github.com/tamu-edu/dor-hprc-drona-composer/edit/master/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    '@docusaurus/theme-live-codeblock',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
      },
    ],
  ],

  markdown: {
    mermaid: true,
  },


  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Drona Composer',
        logo: {
          alt: 'Texas A&M University Logo',
          src: 'img/tamu-icon.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'overview/intro',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://hprc.tamu.edu',
            label: 'HPRC Portal',
            position: 'right',
          },
          {
            href: 'https://github.com/tamu-edu/dor-hprc-drona-composer',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/overview/intro',
              },
              {
                label: 'Frontend Components',
                to: '/docs/frontend/overview',
              },
              {
                label: 'Backend API',
                to: '/docs/backend/overview',
              },
            ],
          },
          {
            title: 'Texas A&M HPRC',
            items: [
              {
                label: 'HPRC Portal',
                href: 'https://hprc.tamu.edu',
              },
              {
                label: 'User Guide',
                href: 'https://hprc.tamu.edu/user-guide/',
              },
              {
                label: 'Support',
                href: 'https://hprc.tamu.edu/contact/',
              },
            ],
          },
          {
            title: 'Development',
            items: [
              {
                label: 'GitHub Repository',
                href: 'https://github.com/tamu-edu/dor-hprc-drona-composer',
              },
              {
                label: 'Issues & Bug Reports',
                href: 'https://github.com/tamu-edu/dor-hprc-drona-composer/issues',
              },
              {
                label: 'Contributing',
                href: 'https://github.com/tamu-edu/dor-hprc-drona-composer/blob/master/CONTRIBUTING.md',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Texas A&M University.`,
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
     },
     mermaid: {
        theme: { light: 'neutral', dark: 'dark' }, 
     },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
});
