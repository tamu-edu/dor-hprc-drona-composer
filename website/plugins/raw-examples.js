// Files under website/examples/ are imported as plain text, so docs can show the real example
// code (see src/components/Snippet.js) instead of copies that can drift from it. The runtime
// library's shared form files are imported the same way (alias @drona-runtime-forms), so a
// snippet can tell which element a $ref points to.
const path = require('path');

module.exports = function rawExamplesPlugin() {
  const examplesDir = path.resolve(__dirname, '..', 'examples');
  const runtimeFormsDir = path.resolve(__dirname, '..', '..', 'runtime_support', 'forms');
  return {
    name: 'raw-examples',
    configureWebpack() {
      return {
        resolve: { alias: { '@drona-runtime-forms': runtimeFormsDir } },
        module: {
          rules: [{ include: [examplesDir, runtimeFormsDir], type: 'asset/source' }],
        },
      };
    },
  };
};
