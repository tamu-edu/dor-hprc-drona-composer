import React from 'react';
import { render, act } from '@testing-library/react';
import Composer from '../Composer';

jest.mock('../schemaElements', () => ({ Containers: ['container'] }));
jest.mock('../FieldRenderer', () => () => null);

// Generic-like layout: a mode field and two containers whose buttonLabels differ per mode
const fields = {
  mode: { type: 'text', value: 'create' },
  createBox: {
    type: 'container',
    condition: 'mode.create',
    elements: {},
  },
  manageBox: {
    type: 'container',
    condition: 'mode.manage',
    elements: { btn: { type: 'buttonLabels', preview: 'Generate action', submit: 'Run action', title: 'Action Preview' } },
  },
};

describe('Composer button labels', () => {
  it('reports labels that follow the visible container', () => {
    const onChange = jest.fn();
    const ref = React.createRef();
    render(<Composer ref={ref} fields={fields} onButtonLabelsChange={onChange} />);
    expect(onChange).toHaveBeenLastCalledWith({ preview: 'Generate', submit: 'Run', title: 'Generated Scripts' });

    act(() => { ref.current.setValues({ mode: 'manage' }); });
    expect(onChange).toHaveBeenLastCalledWith({ preview: 'Generate action', submit: 'Run action', title: 'Action Preview' });

    act(() => { ref.current.setValues({ mode: 'create' }); });
    expect(onChange).toHaveBeenLastCalledWith({ preview: 'Generate', submit: 'Run', title: 'Generated Scripts' });
  });
});
