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
  onBrokenLinks: 'throw',
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
        },
        // There is no blog/ directory; leaving the plugin on only produces a build warning
        blog: false,
        theme: {
          customCss: [
            require.resolve('./src/css/custom.css'),
            // The colour schemes readers can pick in the navbar (src/components/SchemePicker.js)
            require.resolve('./src/css/color-schemes.css'),
          ],
        },
      }),
    ],
  ],

  plugins: [require.resolve('./plugins/raw-examples')],

  themes: [
    '@docusaurus/theme-mermaid',
    '@docusaurus/theme-live-codeblock',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
      },
    ],
  ],

  // Applies the colour scheme saved by the navbar picker (src/components/SchemePicker.js) before
  // the page is drawn, so it doesn't flash the default colours first
  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML:
        "(function(){try{var s=localStorage.getItem('drona-color-scheme');" +
        "if(s&&s!=='maroon'&&/^[a-z]+$/.test(s))document.documentElement.setAttribute('data-scheme',s);}catch(e){}})();",
    },
  ],

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
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
            to: '/#environments',
            position: 'left',
            label: 'Environments',
          },
          {
            type: 'custom-schemePicker',
            position: 'right',
          },
          {
            href: 'https://github.com/tamu-edu/dor-hprc-drona-composer',
            position: 'right',
            className: 'header-icon-link header-github-link',
            'aria-label': 'Drona on GitHub',
          },
          {
            href: 'https://www.youtube.com/playlist?list=PLet85jxf-0Pk',
            position: 'right',
            className: 'header-icon-link header-youtube-link',
            'aria-label': 'Drona demo videos on YouTube',
          },
        ],
      },
      // The footer is src/theme/Footer (a custom component), so it has no settings here
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
