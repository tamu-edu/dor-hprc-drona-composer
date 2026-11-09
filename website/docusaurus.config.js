// prism-react-renderer v2's API (Docusaurus 3.x bundles v2 internally via
// @docusaurus/theme-classic) — the old `require('prism-react-renderer/themes/x')`
// subpath only existed in v1, which is why v1 was still pinned as a direct
// dependency; that's no longer needed with this import style.
const { themes: prismThemes } = require('prism-react-renderer');
const lightCodeTheme = prismThemes.github;
const darkCodeTheme = prismThemes.dracula;

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(module.exports = {
  title: 'Drona Workflow Engine',
  tagline: 'High Performance Computing Workflow Composer Documentation',
  url: 'https://tamu-edu.github.io',
  baseUrl: '/dor-hprc-drona-composer/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/drona-icon.png',
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
        // The old docs repeat the current pages; keep them out of search results
        ignoreFiles: [/^docs\/old-docs\//],
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
        title: 'Drona Workflow Engine',
        logo: {
          alt: 'Drona Workflow Engine',
          src: 'img/drona-icon.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'overview/intro',
            position: 'left',
            label: 'Documentation',
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
              { label: 'Overview', to: '/docs/overview/intro' },
              { label: 'Setup', to: '/docs/setup' },
              { label: 'User Guide', to: '/docs/user-guide/using-drona' },
              { label: 'Tutorial', to: '/docs/tutorial' },
              { label: 'Technical Reference', to: '/docs/overview/architecture' },
              { label: 'Citations', to: '/docs/citations' },
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
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} <a href="http://www.tamu.edu/" style="color: #fff;">Texas A&M University</a>.`,
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
