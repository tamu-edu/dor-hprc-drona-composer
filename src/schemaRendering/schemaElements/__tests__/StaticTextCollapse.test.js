import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import StaticText from '../StaticText';
import { FormValuesContext } from '../../FormValuesContext';

jest.mock('../../utils/FormElementWrapper', () => {
  return function MockWrapper({ children }) {
    return <div>{children}</div>;
  };
});

const okResponse = (payload) => ({
  ok: true,
  json: () => Promise.resolve(payload),
  text: () => Promise.resolve(payload),
});

const renderInForm = (ui) =>
  render(
    <FormValuesContext.Provider value={{ values: [], updateValue: () => {}, environment: { env: 'Test', src: '/envs' } }}>
      {ui}
    </FormValuesContext.Provider>
  );

const settle = async () => {
  await act(async () => { jest.advanceTimersByTime(500); });
  await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
};

beforeEach(() => {
  jest.useFakeTimers();
  global.document.dashboard_url = 'http://test.com';
  global.fetch = jest.fn().mockResolvedValue(okResponse('log text'));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('StaticText collapsible card', () => {
  const layout = { preset: 'card', title: 'Job Logs', collapsible: true, collapsed: true };

  it('holds back the retriever while collapsed and fetches once expanded', async () => {
    renderInForm(<StaticText name="txt" isDynamic retrieverPath="r.sh" layout={layout} />);
    await settle();
    expect(global.fetch).not.toHaveBeenCalled();

    const pill = screen.getByRole('button', { name: /Job Logs/ });
    expect(pill).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(pill);
    await settle();
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('starts expanded when only collapsible is set', async () => {
    renderInForm(<StaticText name="txt" isDynamic retrieverPath="r.sh" layout={{ ...layout, collapsed: false }} />);
    await settle();
    expect(screen.getByRole('button', { name: /Job Logs/ })).toHaveAttribute('aria-expanded', 'true');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('a plain card has no toggle button', () => {
    renderInForm(<StaticText name="txt" value="hi" layout={{ preset: 'card', title: 'Plain' }} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('StaticText refresh button placement', () => {
  it('card frame: the button sits in the top-border slot, not in the content', async () => {
    const { container } = renderInForm(
      <StaticText name="txt" isDynamic retrieverPath="r.sh" showRefreshButton
        layout={{ preset: 'card', title: 'Processes' }} />);
    await settle();
    const button = screen.getByRole('button', { name: 'Refresh content' });
    expect(button.parentElement.style.top).toBe('-12px');
    expect(button.parentElement.style.right).toBe('20px');
    expect(container.querySelector('.py-2 button')).toBeNull();
  });

  it('no frame: the button stays in the content', async () => {
    const { container } = renderInForm(
      <StaticText name="txt" isDynamic retrieverPath="r.sh" showRefreshButton />);
    await settle();
    expect(container.querySelector('.py-2 button')).not.toBeNull();
  });

  it('collapsed card hides the border button', async () => {
    renderInForm(
      <StaticText name="txt" isDynamic retrieverPath="r.sh" showRefreshButton
        layout={{ preset: 'card', title: 'Logs', collapsed: true }} />);
    await settle();
    expect(screen.queryByRole('button', { name: 'Refresh content' })).toBeNull();
  });
});
