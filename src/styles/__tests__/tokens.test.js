import fs from 'fs';
import path from 'path';
import { TOKENS_CSS } from '../tokens';

const tokenValue = (name) => TOKENS_CSS.match(new RegExp(`${name}: ([^;]+);`))[1];
const compact = (stack) => stack.replace(/,\s*/g, ',');

test('the variables are on the page, once', () => {
  jest.isolateModules(() => { require('../tokens'); });
  const sheets = document.querySelectorAll('#drona-tokens');
  expect(sheets).toHaveLength(1);
  expect(sheets[0].textContent).toBe(TOKENS_CSS);
});

test('the font stacks match the Bootstrap the page loads', () => {
  const bootstrap = fs.readFileSync(
    path.join(__dirname, '../../../static/bootstrap-4.4.1/css/bootstrap.min.css'), 'utf8');
  const stackOf = (name) => bootstrap.match(new RegExp(`${name}:([^;}]+)`))[1];
  expect(compact(tokenValue('--drona-font-sans'))).toBe(compact(stackOf('--font-family-sans-serif')));
  expect(compact(tokenValue('--drona-font-mono'))).toBe(compact(stackOf('--font-family-monospace')));
});
