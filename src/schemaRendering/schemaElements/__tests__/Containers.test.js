import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Container from '../Container';
import RowContainer from '../RowContainer';

jest.mock('../../FieldRenderer', () => function MockFieldRenderer() {
  return <div data-testid="fields" />;
});

describe.each([
  ['Container', Container, 'form-group'],
  ['RowContainer', RowContainer, 'form-group row'],
])('%s layout', (name, Component, cls) => {
  test('without layout the markup is unchanged (no frame)', () => {
    const { container } = render(<Component elements={{}} />);
    expect(container.children).toHaveLength(1);
    expect(container.firstChild.className).toBe(cls);
    expect(container.firstChild.firstChild).toHaveAttribute('data-testid', 'fields');
  });

  test('card layout wraps the container in a titled frame', () => {
    const { container } = render(
      <Component elements={{}} layout={{ preset: 'card', title: 'Job Resources' }} />);
    const frame = container.firstChild;
    expect(frame.style.borderRadius).toBe('12px');
    expect(screen.getByText('Job Resources')).toBeInTheDocument();
    expect(frame.querySelector(`div[class="${cls}"]`)).not.toBeNull();
  });

  test('presets that do not apply to containers are ignored', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<Component elements={{}} layout="grid" />);
    expect(container.firstChild.className).toBe(cls);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('Container collapsible card', () => {
  const layout = { preset: 'card', title: 'Workflow Actions', collapsible: true };

  test('title pill folds and unfolds the content (kept mounted)', () => {
    render(<Container elements={{}} layout={layout} />);
    const pill = screen.getByRole('button', { name: /Workflow Actions/ });
    const fields = screen.getByTestId('fields');
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(fields).toBeVisible();

    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('fields')).not.toBeVisible();

    fireEvent.click(pill);
    expect(screen.getByTestId('fields')).toBeVisible();
  });

  test('collapsed starts folded', () => {
    render(<Container elements={{}} layout={{ ...layout, collapsed: true }} />);
    expect(screen.getByRole('button', { name: /Workflow Actions/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('fields')).not.toBeVisible();
  });

  test('a plain card has no toggle', () => {
    render(<Container elements={{}} layout={{ preset: 'card', title: 'Plain' }} />);
    expect(screen.queryByRole('button', { name: /Plain/ })).toBeNull();
  });
});
