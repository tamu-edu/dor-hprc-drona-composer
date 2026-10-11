import React from 'react';
import { render, screen } from '@testing-library/react';
import ChoiceOptions from '../../utils/ChoiceOptions';

describe('ChoiceOptions option state', () => {
  test('button style shows the state dot, hidden state text and detail', () => {
    render(
      <ChoiceOptions
        type="radio"
        name="j"
        style="button"
        selected="1"
        onChange={() => {}}
        options={[
          { value: '1', label: 'Job 1', state: 'running', detail: '2 nodes · 01:00:00' },
          { value: '2', label: 'Job 2' },
        ]}
      />
    );
    expect(screen.getByText('2 nodes · 01:00:00')).toBeTruthy();
    expect(screen.getByLabelText('running')).toBeTruthy();
    expect(document.querySelectorAll('[title]')).toHaveLength(1);
  });
});
