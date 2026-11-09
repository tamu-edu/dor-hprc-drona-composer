import React from 'react';
import { render, waitFor } from '@testing-library/react';
import DynamicViewer from '../DynamicViewer';
import { FormValuesContext } from '../../FormValuesContext';
import { TOKENS_CSS } from '../../../styles/tokens';

const renderViewer = () =>
  render(
    <FormValuesContext.Provider value={{ values: {}, environment: { env: 'Env', src: '/sys' } }}>
      <DynamicViewer name="viewer" value={{ title: 'Viewer', initCode: 'container.textContent = "x";', data: {} }} />
    </FormValuesContext.Provider>
  );

test('the iframe gets the Drona font variables, before the environment code, and a default font', async () => {
  const { container } = renderViewer();
  await waitFor(() => expect(container.querySelector('iframe').srcdoc).toContain('<!DOCTYPE html>'));
  const html = container.querySelector('iframe').srcdoc;
  expect(html).toContain(TOKENS_CSS);
  expect(html).toMatch(/body \{[^}]*font-family: var\(--drona-font-sans\)/);
  expect(html.indexOf(TOKENS_CSS)).toBeLessThan(html.indexOf('container.textContent'));
});
