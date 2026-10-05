import { resolveAppearance, resolveLayout } from '../choiceStyles';

describe('resolveAppearance', () => {
  test('defaults', () => {
    expect(resolveAppearance(undefined).kind).toBe('input');
    expect(resolveAppearance('default').kind).toBe('input');
  });
  test('button', () => {
    expect(resolveAppearance('button').kind).toBe('button');
  });
  test('unknown falls back to default with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveAppearance('fancy').kind).toBe('input');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('resolveLayout', () => {
  test('empty layout resolves to no frame', () => {
    const r = resolveLayout(undefined);
    expect(r).toEqual({ frame: null, box: null, inner: null, stacked: false, title: null, dot: false, accent: false });
  });
  test('card accent adds the maroon edge; tint:false drops only the background', () => {
    const plain = resolveLayout({ preset: 'card' });
    expect(plain.accent).toBe(false);
    expect(plain.frame.borderLeft).toBeUndefined();

    const accent = resolveLayout({ preset: 'card', accent: true });
    expect(accent.accent).toBe(true);
    expect(accent.frame.borderLeft).toBe('4px solid #500000');
    expect(accent.frame.background).toContain('linear-gradient');

    const untinted = resolveLayout({ preset: 'card', accent: true, tint: false });
    expect(untinted.frame.borderLeft).toBe('4px solid #500000');
    expect(untinted.frame.background).toBe('#ffffff');
  });
  test('inline is a no-op', () => {
    expect(resolveLayout('inline').stacked).toBe(false);
  });
  test('list stacks', () => {
    expect(resolveLayout('list').stacked).toBe(true);
  });
  test('boxed with title', () => {
    const r = resolveLayout({ preset: 'boxed', title: 'Running jobs' });
    expect(r.title).toBe('Running jobs');
    expect(r.box.border).toMatch(/solid/);
  });
  test('grid uses auto-fit and honours minWidth', () => {
    expect(resolveLayout('grid').inner.gridTemplateColumns).toBe('repeat(auto-fit, minmax(12rem, 1fr))');
    expect(resolveLayout({ preset: 'grid', minWidth: '8rem' }).inner.gridTemplateColumns)
      .toBe('repeat(auto-fit, minmax(8rem, 1fr))');
  });
  test('array combines presets and CSS', () => {
    const r = resolveLayout(['list', 'boxed', { maxHeight: '220px' }]);
    expect(r.stacked).toBe(true);
    expect(r.box.border).toBeDefined();
    expect(r.box.maxHeight).toBe('220px');
  });
  test('bare CSS object goes on the box', () => {
    expect(resolveLayout({ maxHeight: '100px' }).box).toEqual({ maxHeight: '100px' });
  });
  test('unknown presets and params are ignored with warnings', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveLayout('nope').box).toBeNull();
    expect(resolveLayout({ preset: 'list', title: 'x' }).title).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
  test('card puts border/radius on the frame and CSS on the inner box', () => {
    const r = resolveLayout([{ preset: 'card', title: 'Slurm Actions' }, { maxHeight: '220px' }]);
    expect(r.title).toBe('Slurm Actions');
    expect(r.dot).toBe(true);
    expect(r.frame.borderRadius).toBe('12px');
    expect(r.frame.maxHeight).toBeUndefined();
    expect(r.box).toEqual({ maxHeight: '220px' });
  });
  test('card dot can be turned off', () => {
    expect(resolveLayout({ preset: 'card', title: 'x', dot: false }).dot).toBe(false);
  });
});
