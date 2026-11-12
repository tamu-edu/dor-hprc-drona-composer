const yaml = require('js-yaml');

module.exports = {
  process(sourceText) {
    const data = yaml.load(sourceText);
    return { code: `module.exports = ${JSON.stringify(data)};` };
  },
};
