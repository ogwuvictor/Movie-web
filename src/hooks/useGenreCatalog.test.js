import { act, renderHook, waitFor } from '@testing-library/react';
import useGenreCatalog from './useGenreCatalog';

const reply = data => ({ ok: true, json: async () => data });
const title = id => ({ id, title: `Title ${id}` });
afterEach(() => { delete global.fetch; });

test.each(['movie', 'tv'])('%s pagination appends unique titles, locks duplicate requests and stops at the last page', async type => {
  let finishSecond;
  global.fetch = jest.fn(url => {
    if (url.includes('/genre/')) return Promise.resolve(reply({ genres: [{ id: 28, name: 'Action' }] }));
    const page = new URL(url).searchParams.get('page');
    if (page === '1') return Promise.resolve(reply({ results: [title(1), title(2)], total_pages: 2 }));
    return new Promise(resolve => { finishSecond = () => resolve(reply({ results: [title(2), title(3)], total_pages: 2 })); });
  });
  const { result } = renderHook(() => useGenreCatalog(type, '28'));
  await waitFor(() => expect(result.current.items).toHaveLength(2));
  act(() => { result.current.loadMore(); result.current.loadMore(); });
  expect(global.fetch.mock.calls.filter(([url]) => url.includes('page=2'))).toHaveLength(1);
  await act(async () => { finishSecond(); });
  expect(result.current.items.map(item => item.id)).toEqual([1, 2, 3]);
  expect(result.current.hasMore).toBe(false);
  await act(async () => { await result.current.loadMore(); });
  expect(global.fetch.mock.calls.filter(([url]) => url.includes('/discover/'))).toHaveLength(2);
});

test('failed next page retains existing cards and retries that same page', async () => {
  let secondAttempts = 0;
  global.fetch = jest.fn(async url => {
    if (url.includes('/genre/')) return reply({ genres: [] });
    if (new URL(url).searchParams.get('page') === '1') return reply({ results: [title(1)], total_pages: 2 });
    if (++secondAttempts === 1) throw new Error('Offline');
    return reply({ results: [title(2)], total_pages: 2 });
  });
  const { result } = renderHook(() => useGenreCatalog('movie', '28'));
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  await act(async () => { await result.current.loadMore(); });
  expect(result.current.error).toMatch(/Unable to load/);
  expect(result.current.items.map(item => item.id)).toEqual([1]);
  await act(async () => { await result.current.loadMore(); });
  expect(result.current.items.map(item => item.id)).toEqual([1, 2]);
  expect(result.current.error).toBeNull();
});

test('changing genres aborts old requests and ignores late responses', async () => {
  let finishOld;
  let oldSignal;
  global.fetch = jest.fn((url, options) => {
    if (url.includes('/genre/')) return Promise.resolve(reply({ genres: [] }));
    if (url.includes('with_genres=28')) {
      oldSignal = options.signal;
      return new Promise(resolve => { finishOld = () => resolve(reply({ results: [title(1)], total_pages: 1 })); });
    }
    return Promise.resolve(reply({ results: [title(2)], total_pages: 1 }));
  });
  const { result, rerender } = renderHook(({ genre }) => useGenreCatalog('movie', genre), { initialProps: { genre: '28' } });
  rerender({ genre: '35' });
  await waitFor(() => expect(result.current.items.map(item => item.id)).toEqual([2]));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { finishOld(); });
  expect(result.current.items.map(item => item.id)).toEqual([2]);
});
