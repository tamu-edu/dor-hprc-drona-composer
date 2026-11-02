import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnvironmentFilmstrip from '../EnvironmentFilmstrip';

const ENVS = [{ env: 'Generic', value: 'Generic', label: 'Generic', src: '/sys', is_user_env: false }];

test('shows the Import tile when import is enabled (a handler is passed)', () => {
  render(<EnvironmentFilmstrip environments={ENVS} onAddEnvironment={jest.fn()} />);
  expect(screen.getByRole('button', { name: /Import/ })).toBeInTheDocument();
});

test('hides the Import tile when import is turned off (no handler)', () => {
  render(<EnvironmentFilmstrip environments={ENVS} />);
  expect(screen.queryByText('Import')).toBeNull();
  expect(screen.getByText('Generic')).toBeInTheDocument();
});
