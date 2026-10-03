import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ChoiceOptions from '../../utils/ChoiceOptions';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

const base = { name: 'f', options, selected: 'a', onChange: () => {} };

describe('ChoiceOptions', () => {
  test('default renders inline form-check options with no extra wrapper', () => {
    const { container } = render(<ChoiceOptions type="radio" {...base} />);
    expect(container.children).toHaveLength(2);
    container.querySelectorAll('.form-check').forEach((el) =>
      expect(el).toHaveClass('form-check-inline'));
  });

  test('list layout drops the inline class', () => {
    const { container } = render(<ChoiceOptions type="radio" {...base} layout="list" />);
    container.querySelectorAll('.form-check').forEach((el) =>
      expect(el).not.toHaveClass('form-check-inline'));
  });

  test('button appearance works for checkboxes', () => {
    const { container } = render(
      <ChoiceOptions type="checkbox" {...base} selected={['b']} style="button" />);
    expect(container.querySelectorAll('input.btn-check[type="checkbox"]')).toHaveLength(2);
    expect(screen.getByText('Beta')).toHaveClass('maroon-button-filled');
    expect(screen.getByText('Alpha')).toHaveClass('maroon-button');
  });

  test('boxed layout shows the title and CSS', () => {
    const { container } = render(
      <ChoiceOptions type="radio" {...base}
        layout={[{ preset: 'boxed', title: 'My box' }, { maxHeight: '50px' }]} />);
    expect(screen.getByText('My box')).toBeInTheDocument();
    expect(container.firstChild.style.maxHeight).toBe('50px');
  });

  test('title text is rendered as text, not HTML', () => {
    const { container } = render(
      <ChoiceOptions type="radio" {...base} layout={{ preset: 'boxed', title: '<img src=x>' }} />);
    expect(container.querySelector('img')).toBeNull();
  });

  test('uses the latest onChange without re-creating options', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { container, rerender } = render(<ChoiceOptions type="radio" {...base} onChange={first} />);
    rerender(<ChoiceOptions type="radio" {...base} onChange={second} />);
    fireEvent.click(container.querySelector('input[value="b"]'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });

  test('card renders a title pill with a dot and scrolls only the options', () => {
    const { container } = render(
      <ChoiceOptions type="radio" {...base}
        layout={[{ preset: 'card', title: 'Slurm Actions' }, { maxHeight: '50px', overflowY: 'auto' }]} />);
    const frame = container.firstChild;
    expect(frame.style.borderRadius).toBe('12px');
    expect(frame.style.overflowY).toBe('');
    expect(screen.getByText('Slurm Actions').firstChild.tagName).toBe('STYLE');
    const scroller = frame.lastChild;
    expect(scroller.style.maxHeight).toBe('50px');
    expect(scroller.querySelectorAll('input')).toHaveLength(2);
  });

  test('card without dot renders no dot', () => {
    render(<ChoiceOptions type="radio" {...base}
      layout={{ preset: 'card', title: 'Plain', dot: false }} />);
    expect(screen.getByText('Plain').querySelector('style')).toBeNull();
  });
});
