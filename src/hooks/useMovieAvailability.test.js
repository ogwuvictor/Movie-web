import { act, renderHook, waitFor } from '@testing-library/react';
import useMovieAvailability from './useMovieAvailability';

const movie = { id: 550, status: 'Released', release_date: '2000-01-01' };
const response = () => ({ ok: true, json: async () => ({ movies: { 550: {
  available: true, serverIds: ['vidlink'], checkedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 2000).toISOString(),
} } }) });
afterEach(() => { delete global.fetch; jest.useRealTimers(); });

test('an availability error leaves Watch Now hidden', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('Offline'));
  const { result } = renderHook(() => useMovieAvailability(movie));
  await act(async () => {});
  expect(result.current).toBeNull();
});

test('upcoming movies never request source availability', () => {
  global.fetch = jest.fn();
  const { result } = renderHook(() => useMovieAvailability({ ...movie, release_date: '2999-01-01' }));
  expect(result.current).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a source confirmation disappears when it expires', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn(async () => response());
  const { result } = renderHook(() => useMovieAvailability(movie));
  await waitFor(() => expect(result.current?.serverIds).toEqual(['vidlink']));
  act(() => { jest.advanceTimersByTime(2100); });
  expect(result.current).toBeNull();
});

test('navigating to another title clears availability and ignores a late old response', async () => {
  let resolveOld;
  global.fetch = jest.fn(() => new Promise(resolve => { resolveOld = resolve; }));
  const { result, rerender } = renderHook(selection => useMovieAvailability(selection), { initialProps: movie });
  const oldResponse = resolveOld;
  rerender({ ...movie, id: 551 });
  await act(async () => { oldResponse(response()); });
  expect(result.current).toBeNull();
});
