import { resolveButtonLabels, DEFAULT_BUTTON_LABELS } from '../buttonLabels';

const labels = (extra) => ({ type: 'buttonLabels', isVisible: true, ...extra });
const container = (elements, isVisible = true) => ({ type: 'container', isVisible, elements });

describe('resolveButtonLabels', () => {
  it('uses Generate / Run / Generated Scripts when no element is present', () => {
    expect(DEFAULT_BUTTON_LABELS).toEqual({ preview: 'Generate', submit: 'Run', title: 'Generated Scripts' });
    expect(resolveButtonLabels([])).toEqual(DEFAULT_BUTTON_LABELS);
    expect(resolveButtonLabels(undefined)).toEqual(DEFAULT_BUTTON_LABELS);
  });

  it('takes labels from a visible element and fills missing keys with defaults', () => {
    expect(resolveButtonLabels([labels({ preview: 'Review' })]))
      .toEqual({ preview: 'Review', submit: 'Run', title: 'Generated Scripts' });
    expect(resolveButtonLabels([labels({ preview: '  ', submit: 'Execute', title: 'Action Preview' })]))
      .toEqual({ preview: 'Generate', submit: 'Execute', title: 'Action Preview' });
  });

  it('ignores hidden elements and elements in hidden containers', () => {
    expect(resolveButtonLabels([labels({ submit: 'X', isVisible: false })])).toEqual(DEFAULT_BUTTON_LABELS);
    expect(resolveButtonLabels([container([labels({ submit: 'X' })], false)])).toEqual(DEFAULT_BUTTON_LABELS);
  });

  it('lets the most deeply nested visible element win, regardless of order', () => {
    const fields = [
      container([container([labels({ submit: 'Run action' })])]),
      labels({ preview: 'Top', submit: 'Top run' }),
    ];
    expect(resolveButtonLabels(fields)).toEqual({ preview: 'Generate', submit: 'Run action', title: 'Generated Scripts' });
  });

  it('picks the later element at equal depth', () => {
    expect(resolveButtonLabels([labels({ submit: 'A' }), labels({ submit: 'B' })]).submit).toBe('B');
  });
});
