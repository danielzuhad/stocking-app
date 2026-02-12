import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import InputSearch from './input-search';

const replaceMock = jest.fn();
let currentPathname = '/system-logs';
let currentQuery = '';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => {
    const params = new URLSearchParams(currentQuery);
    return {
      get: (key: string) => params.get(key),
      toString: () => params.toString(),
    };
  },
}));

describe('InputSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentPathname = '/system-logs';
    currentQuery = 'q=&dt_system_logs_page=1&dt_system_logs_pageSize=10';
  });

  it('keeps typed value in input before debounce finishes', async () => {
    const user = userEvent.setup();
    render(<InputSearch queryKey="q" urlStateKey="dt_system_logs" />);

    const input = screen.getByRole('searchbox', { name: 'Cari...' });
    await user.type(input, 'audit');

    expect(input).toHaveValue('audit');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('does not reset typed value when unrelated URL params change', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <InputSearch queryKey="q" urlStateKey="dt_system_logs" />,
    );

    const input = screen.getByRole('searchbox', { name: 'Cari...' });
    await user.type(input, 'audit');
    expect(input).toHaveValue('audit');

    currentQuery = 'q=&dt_system_logs_page=2&dt_system_logs_pageSize=10';
    rerender(<InputSearch queryKey="q" urlStateKey="dt_system_logs" />);

    expect(input).toHaveValue('audit');
  });

  it('updates URL after debounce and resets page to 1', async () => {
    jest.useFakeTimers();
    currentQuery = 'q=old&dt_system_logs_page=3&dt_system_logs_pageSize=20';
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <InputSearch
        queryKey="q"
        urlStateKey="dt_system_logs"
        debounceMs={400}
      />,
    );

    const input = screen.getByRole('searchbox', { name: 'Cari...' });
    await user.clear(input);
    await user.type(input, 'new');

    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(replaceMock).toHaveBeenCalledTimes(1);
    const [url, options] = replaceMock.mock.calls[0] as [string, { scroll: boolean }];
    const params = new URL(url, 'https://example.test').searchParams;

    expect(options).toEqual({ scroll: false });
    expect(params.get('q')).toBe('new');
    expect(params.get('dt_system_logs_page')).toBe('1');
    expect(params.get('dt_system_logs_pageSize')).toBe('20');

    jest.useRealTimers();
  });

  it('does not overwrite newer typed value when stale URL ack arrives', async () => {
    jest.useFakeTimers();
    currentQuery = 'q=&dt_system_logs_page=1&dt_system_logs_pageSize=10';
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { rerender } = render(
      <InputSearch
        queryKey="q"
        urlStateKey="dt_system_logs"
        debounceMs={400}
      />,
    );

    const input = screen.getByRole('searchbox', { name: 'Cari...' });

    await user.type(input, 'a');
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(replaceMock).toHaveBeenCalledTimes(1);

    await user.type(input, 'b');
    expect(input).toHaveValue('ab');

    // Simulate late router ack for previous debounced value (`q=a`).
    currentQuery = 'q=a&dt_system_logs_page=1&dt_system_logs_pageSize=10';
    rerender(
      <InputSearch
        queryKey="q"
        urlStateKey="dt_system_logs"
        debounceMs={400}
      />,
    );

    expect(input).toHaveValue('ab');
    jest.useRealTimers();
  });

  it('keeps empty query in URL (no-clean mode)', async () => {
    jest.useFakeTimers();
    currentQuery = 'q=term&dt_system_logs_page=2';
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <InputSearch
        queryKey="q"
        urlStateKey="dt_system_logs"
        debounceMs={400}
      />,
    );

    const input = screen.getByRole('searchbox', { name: 'Cari...' });
    await user.clear(input);

    act(() => {
      jest.advanceTimersByTime(400);
    });

    const [url] = replaceMock.mock.calls[0] as [string];
    const params = new URL(url, 'https://example.test').searchParams;

    expect(params.has('q')).toBe(true);
    expect(params.get('q')).toBe('');
    expect(params.get('dt_system_logs_page')).toBe('1');

    jest.useRealTimers();
  });
});
