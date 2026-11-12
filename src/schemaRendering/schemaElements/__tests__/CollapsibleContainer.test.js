import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleRowContainer, CollapsibleColContainer } from '../CollapsibleContainer';
import { FormValuesContext } from '../../FormValuesContext';

jest.mock('../../FieldRenderer', () => function MockFieldRenderer() {
  return <div data-testid="fields" />;
});

describe.each([
  ['CollapsibleRowContainer', CollapsibleRowContainer],
  ['CollapsibleColContainer', CollapsibleColContainer],
])('%s', (name, Component) => {
  test('default keeps the header and maroon Show/Hide button', () => {
    render(<Component elements={{}} title="Slurm Options" default_state="collapsed" />);
    expect(screen.getByText(/Show Slurm Options/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/Hide Slurm Options/)).toBeInTheDocument();
  });

  test('card layout: the title pill is the only toggle and hides content', () => {
    const { container } = render(
      <Component elements={{}} title="Slurm Options" default_state="collapsed" layout="card" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    const pill = buttons[0];
    expect(pill).toHaveTextContent('Slurm Options');
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Show Slurm Options/)).toBeNull();
    expect(container.firstChild.style.borderRadius).toBe('12px');

    const content = screen.getByTestId('fields').closest('div[style*="display: none"]');
    expect(content).not.toBeNull();

    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('fields').closest('div[style*="display: none"]')).toBeNull();
  });

  test('a layout title overrides the title prop', () => {
    render(<Component elements={{}} title="Fallback"
      layout={{ preset: 'card', title: 'From layout' }} />);
    expect(screen.getByRole('button')).toHaveTextContent('From layout');
  });

  test('unsupported layout presets fall back to the default header', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Component elements={{}} title="T" layout="boxed" />);
    expect(screen.getByText(/Hide T/)).toBeInTheDocument();
    warn.mockRestore();
  });

  test('collapsed card with a summary shows the field values instead of the hint', () => {
    const values = [
      { name: 'seed', value: '42' },
      { name: 'precision', value: { value: '16-mixed', label: '16-bit mixed (GPU)' } },
    ];
    render(
      <FormValuesContext.Provider value={{ values, updateValue: () => {} }}>
        <Component elements={{}} title="Advanced" default_state="collapsed"
          layout={{ preset: 'card', summary: 'seed $seed · precision $precision' }} />
      </FormValuesContext.Provider>);
    expect(screen.getByText('seed 42 · precision 16-mixed')).toBeInTheDocument();
    expect(screen.queryByText('Click to expand')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('seed 42 · precision 16-mixed')).toBeNull();
  });

  test('summary leaves out parts whose fields are empty, and falls back to the hint', () => {
    const values = [{ name: 'walltime', value: '' }, { name: 'memory', value: '8G' }, { name: 'onnx', value: '' }];
    const { rerender } = render(
      <FormValuesContext.Provider value={{ values, updateValue: () => {} }}>
        <Component elements={{}} title="Additional" default_state="collapsed"
          layout={{ preset: 'card', summary: 'walltime $walltime · memory $memory · ONNX $onnx' }} />
      </FormValuesContext.Provider>);
    expect(screen.getByText('memory 8G')).toBeInTheDocument();

    const empty = values.map((v) => ({ ...v, value: '' }));
    rerender(
      <FormValuesContext.Provider value={{ values: empty, updateValue: () => {} }}>
        <Component elements={{}} title="Additional" default_state="collapsed"
          layout={{ preset: 'card', summary: 'walltime $walltime · memory $memory · ONNX $onnx' }} />
      </FormValuesContext.Provider>);
    expect(screen.getByText('Click to expand')).toBeInTheDocument();
  });

  test('collapsed card shows a hint and expands when the strip is clicked', () => {
    const { container } = render(
      <Component elements={{}} title="Logs" default_state="collapsed" layout="card" />);
    const pill = screen.getByRole('button');
    expect(screen.getByText('Click to expand')).toBeInTheDocument();

    // click on the strip itself (not the pill) expands it, exactly once
    fireEvent.click(container.firstChild);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText('Click to expand')).toBeNull();
  });

  test('clicking the pill toggles once (no double toggle from the strip handler)', () => {
    render(<Component elements={{}} title="Logs" default_state="collapsed" layout="card" />);
    const pill = screen.getByRole('button');
    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'false');
  });

  test('when expanded, clicking the content does not collapse the card', () => {
    render(<Component elements={{}} title="Logs" layout="card" />);
    fireEvent.click(screen.getByTestId('fields'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  test('the pill has hover/focus styles and a decorative chevron', () => {
    const { container } = render(<Component elements={{}} title="Logs" layout="card" />);
    expect(screen.getByRole('button')).toHaveClass('choice-card-toggle');
    expect(container.querySelector('style').textContent).toMatch(/:hover/);
    expect(container.querySelector('style').textContent).toMatch(/focus-visible/);
    expect(screen.getByRole('button', { name: 'Logs' })).toBeInTheDocument();
  });
});
