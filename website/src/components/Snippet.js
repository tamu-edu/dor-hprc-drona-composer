// Shows code from the WordCount example (website/examples/word-count) in the docs: a whole file,
// or one part of it. Because the code is read from the example files at build time, the pages
// can't drift from them; a part that no longer exists fails the build.
//
//   <Snippet file="map.json" />                                   the whole file
//   <Snippet file="schemas/create.schema.json" json="top_n" />    one top-level JSON key
//   <Snippet file="map.json" json={["JOBNAME", "flocation"]} />   several keys, in this order
//   <Snippet file="utils.py" fn="check_top_n" />                  one Python function
//   <Snippet file="jobscripts/word-count.slurm" lines="9-16" />   a line range (1-based, inclusive)
import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import Link from '@docusaurus/Link';

// Every file of the example, and the runtime library's shared form files, as text
// (see plugins/raw-examples.js)
const files = require.context('@site/examples/word-count', true, /\.(json|sh|py|slurm|yml)$/);
const runtimeForms = require.context('@drona-runtime-forms', false, /\.json$/);

const EXAMPLE = 'word-count';
const SOURCE_URL =
  'https://github.com/tamu-edu/dor-hprc-drona-composer/blob/master/website/examples/word-count/';

const LANGUAGES = { json: 'json', sh: 'bash', slurm: 'bash', py: 'python', yml: 'yaml' };

function read(file) {
  const key = `./${file}`;
  if (!files.keys().includes(key)) {
    throw new Error(`Snippet: ${EXAMPLE}/${file} does not exist`);
  }
  const content = files(key);
  return typeof content === 'string' ? content : content.default;
}

function jsonPart(text, file, keys) {
  const data = JSON.parse(text);
  return keys
    .map((key) => {
      if (!(key in data)) throw new Error(`Snippet: ${EXAMPLE}/${file} has no key "${key}"`);
      return `${JSON.stringify(key)}: ${JSON.stringify(data[key], null, 2)}`;
    })
    .join(',\n');
}

// The element a "$DRONA_RUNTIME_DIR/forms/<file>#/<path>" reference points to. A reference
// without a path inserts every top-level element of the file.
function resolveRef(ref) {
  const match = ref.match(/^\$DRONA_RUNTIME_DIR\/forms\/([^#]+)(?:#\/(.*))?$/);
  if (!match) throw new Error(`Snippet: can't resolve $ref ${ref}`);
  const key = `./${match[1]}`;
  if (!runtimeForms.keys().includes(key)) throw new Error(`Snippet: runtime form ${match[1]} does not exist`);
  const content = runtimeForms(key);
  let data = JSON.parse(typeof content === 'string' ? content : content.default);
  if (!match[2]) return Object.values(data);
  for (const part of match[2].split('/')) {
    if (!(part in data)) throw new Error(`Snippet: ${ref} not found`);
    data = data[part];
  }
  return [data];
}

// The form element types a JSON snippet uses, in order of appearance: the types written in it,
// and for a shared "$ref" element the type of the element it inserts (not that element's children)
function elementTypes(elements) {
  const types = [];
  const visit = (element) => {
    if (!element || typeof element !== 'object') return;
    const resolved = element.$ref ? resolveRef(element.$ref) : [element];
    resolved.forEach((item) => item && item.type && types.push(item.type));
    if (!element.$ref && element.elements) Object.values(element.elements).forEach(visit);
  };
  elements.forEach(visit);
  return [...new Set(types)];
}

function pythonFunction(text, file, name) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`def ${name}(`));
  if (start < 0) throw new Error(`Snippet: ${EXAMPLE}/${file} has no function "${name}"`);
  let end = start + 1;
  // The function ends at the next line that starts at column 0 (the next definition)
  while (end < lines.length && (lines[end] === '' || /^\s/.test(lines[end]))) end += 1;
  return lines.slice(start, end).join('\n').trimEnd();
}

function lineRange(text, file, range) {
  const [from, to] = range.split('-').map(Number);
  const lines = text.split('\n');
  if (!from || !to || from > to || to > lines.length) {
    throw new Error(`Snippet: ${EXAMPLE}/${file} has no lines ${range}`);
  }
  return lines.slice(from - 1, to).join('\n');
}

export default function Snippet({ file, json, fn, lines, title }) {
  const text = read(file);
  let code = text.trimEnd();
  if (json) code = jsonPart(text, file, Array.isArray(json) ? json : [json]);
  else if (fn) code = pythonFunction(text, file, fn);
  else if (lines) code = lineRange(text, file, lines);

  const extension = file.split('.').pop();
  const part = json || fn || lines;
  // A form file (schema.json, schemas/*.json) labels each element type it uses, linking to its
  // reference; the build's anchor check fails on a type that has no section there
  let types = [];
  if (/(^|\/)(schema|[^/]*\.schema)\.json$/.test(file)) {
    const data = JSON.parse(text);
    const keys = json ? (Array.isArray(json) ? json : [json]) : Object.keys(data);
    types = elementTypes(keys.map((key) => data[key]));
  }
  // Code that pulls in a ready-made part says so, to show how much an environment reuses
  const usesLibrary = /\$ref|\$include|\$DRONA_RUNTIME_DIR|retrieve_workflow_actions/.test(code);
  return (
    <div className="snippet">
      {(usesLibrary || types.length > 0) && (
        <div className="snippet__badges">
          {usesLibrary && (
            <Link className="snippet__badge" to="/docs/runtime-library">
              Uses the Drona Runtime Library
            </Link>
          )}
          {types.map((type) => (
            <Link
              key={type}
              className="snippet__badge snippet__badge--element"
              to={`/docs/frontend/form-components#${type.toLowerCase()}`}
              title={`${type}: see Form Components`}>
              {type}
            </Link>
          ))}
        </div>
      )}
      <CodeBlock language={LANGUAGES[extension] || 'text'} title={title || `${EXAMPLE}/${file}`}>
        {code}
      </CodeBlock>
      {part && (
        <div className="snippet__source">
          Part of <a href={SOURCE_URL + file}>{`${EXAMPLE}/${file}`}</a>
        </div>
      )}
    </div>
  );
}
