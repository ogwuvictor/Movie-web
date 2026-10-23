import { act, renderHook } from '@testing-library/react';
import useStreaming from './useStreaming';

const selection = { tmdbId: 550, mediaType: 'movie' };
const servers = ['first', 'second'].map(id => ({ id, type: 'video', enabled: true, verified: true,
  supports: () => true, buildUrl: ({ tmdbId, season, episode }) => `https://example.com/${id}/${tmdbId}/${season}/${episode}` }));

test('stays idle until explicitly started, then opens the configured provider', () => {
  const { result } = renderHook(() => useStreaming(selection));
  expect(result.current.status).toBe('idle');
  expect(result.current.url).toBe('');
  act(() => result.current.start());
  expect(result.current.status).toBe('loading');
  expect(result.current.url).toBe('https://vidlink.pro/movie/550');
  act(() => result.current.fail());
  expect(result.current.url).toBe('https://player.videasy.net/movie/550');
  act(() => result.current.switchServer('vidfast'));
  expect(result.current.source.id).toBe('vidfast');
  act(() => result.current.switchServer('movies111'));
  expect(result.current.source.id).toBe('movies111');
});
test('uses the selected title, switches servers, falls back, then fails gracefully', () => {
  const { result } = renderHook(() => useStreaming(selection, servers));
  act(() => result.current.start());
  expect(result.current.url).toContain('/first/550/');
  act(() => result.current.switchServer('second'));
  expect(result.current.url).toContain('/second/550/');
  act(() => result.current.switchServer('first'));
  act(() => result.current.videoProps.onError());
  expect(result.current.source.id).toBe('second');
  act(() => result.current.videoProps.onError());
  expect(result.current.status).toBe('error');
  act(() => result.current.start());
  expect(result.current.source.id).toBe('first');
});
test('episode changes stop the previous player; late events cannot change the new title', () => {
  const { result, rerender } = renderHook(props => useStreaming(props, servers), { initialProps: selection });
  act(() => result.current.start());
  const oldError = result.current.fail;
  rerender({ tmdbId: 1399, mediaType: 'tv', season: 2, episode: 3 });
  expect(result.current.status).toBe('idle');
  expect(result.current.url).toBe('');
  act(() => result.current.start());
  act(() => oldError());
  expect(result.current.url).toContain('/1399/2/3');
  expect(result.current.source.id).toBe('first');
});
test('iframe load never reports verified playback', () => {
  const { result } = renderHook(() => useStreaming(selection, servers));
  act(() => result.current.start());
  act(() => result.current.iframeProps.onLoad());
  expect(result.current.status).toBe('embedded-unverified');
});
test('native media readiness and actual playing remain distinct', () => {
  const { result } = renderHook(() => useStreaming(selection, servers));
  act(() => result.current.start());
  act(() => result.current.videoProps.onCanPlay());
  expect(result.current.status).toBe('ready');
  act(() => result.current.videoProps.onPlaying());
  expect(result.current.status).toBe('playing');
});
test('initialization timeout tries only the configured authorized sources', () => {
  jest.useFakeTimers();
  const { result, unmount } = renderHook(() => useStreaming(selection, servers));
  act(() => result.current.start());
  act(() => jest.advanceTimersByTime(20000));
  expect(result.current.source.id).toBe('second');
  act(() => jest.advanceTimersByTime(20000));
  expect(result.current.status).toBe('error');
  unmount();
  jest.useRealTimers();
});
test('invalid selections never initialize playback', () => {
  const { result } = renderHook(() => useStreaming({ tmdbId: -1 }, servers));
  act(() => result.current.start());
  expect(result.current.error).toMatch(/positive integer/);
  expect(result.current.url).toBe('');
});
test('native video progress resumes per title, episode and source', () => {
  localStorage.clear();
  const { result } = renderHook(() => useStreaming(selection, servers));
  act(() => result.current.start());
  result.current.videoProps.onTimeUpdate({ currentTarget: { currentTime: 42, ended: false } });
  const video = { currentTime: 0, duration: 100 };
  result.current.videoProps.onLoadedMetadata({ currentTarget: video });
  expect(video.currentTime).toBe(42);
  act(() => result.current.switchServer('second'));
  const otherVideo = { currentTime: 0, duration: 100 };
  result.current.videoProps.onLoadedMetadata({ currentTarget: otherVideo });
  expect(otherVideo.currentTime).toBe(0);
});
test('invalid source URLs fall back before a media element is initialized', () => {
  const invalidFirst = [{ ...servers[0], buildUrl: () => 'http://example.com/insecure' }, servers[1]];
  const { result } = renderHook(() => useStreaming(selection, invalidFirst));
  act(() => result.current.start());
  expect(result.current.source.id).toBe('second');
  expect(result.current.url).toMatch(/^https:/);
});
test('closing discards playback and cancels the initialization timer', () => {
  jest.useFakeTimers();
  const { result, unmount } = renderHook(() => useStreaming(selection, servers));
  act(() => result.current.start());
  act(() => result.current.close());
  act(() => jest.advanceTimersByTime(40000));
  expect(result.current.status).toBe('idle');
  expect(result.current.url).toBe('');
  unmount();
  jest.useRealTimers();
});
test('withdrawing configured sources stops initialization with an error', () => {
  const { result, rerender } = renderHook(({ sources }) => useStreaming(selection, sources), { initialProps: { sources: servers } });
  act(() => result.current.start());
  rerender({ sources: [] });
  expect(result.current.status).toBe('error');
  expect(result.current.url).toBe('');
});
test('late media events from a previous attempt cannot fail a retry of the same title', () => {
  const { result } = renderHook(() => useStreaming(selection, servers));
  act(() => result.current.start());
  const oldError = result.current.videoProps.onError;
  act(() => result.current.close());
  act(() => result.current.start());
  act(() => oldError());
  expect(result.current.status).toBe('loading');
  expect(result.current.source.id).toBe('first');
});
test('native pause, buffering and ended events report their actual states', () => {
  const { result } = renderHook(() => useStreaming(selection, servers));
  act(() => result.current.start());
  act(() => result.current.videoProps.onPlaying());
  act(() => result.current.videoProps.onPause({ currentTarget: { currentTime: 2, ended: false } }));
  expect(result.current.status).toBe('paused');
  act(() => result.current.videoProps.onWaiting());
  expect(result.current.status).toBe('buffering');
  act(() => result.current.videoProps.onEnded({ currentTarget: { currentTime: 10, ended: true } }));
  expect(result.current.status).toBe('ended');
});
test('buffering timeout attempts the next eligible source', () => {
  jest.useFakeTimers();
  const { result, unmount } = renderHook(() => useStreaming(selection, servers));
  act(() => result.current.start());
  act(() => result.current.videoProps.onPlaying());
  act(() => result.current.videoProps.onWaiting());
  act(() => jest.advanceTimersByTime(20000));
  expect(result.current.source.id).toBe('second');
  unmount();
  jest.useRealTimers();
});
test('VidLink duration messages require the exact iframe sender, origin and selected title', () => {
  const { result, unmount } = renderHook(() => useStreaming(selection));
  act(() => result.current.start());
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  result.current.iframeRef.current = frame;
  const data = { type: 'PLAYER_EVENT', data: { event: 'play', mtmdbId: 550, mediaType: 'movie', currentTime: 60, duration: 7200 } };
  const send = overrides => act(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://vidlink.pro', source: frame.contentWindow, data, ...overrides })));
  send({ origin: 'https://untrusted.example' });
  send({ source: window });
  send({ data: { ...data, data: { ...data.data, mtmdbId: 551 } } });
  expect(result.current.providerProgress).toBeNull();
  send({});
  expect(result.current.providerProgress.duration).toBe(7200);
  expect(result.current.status).toBe('playing');
  act(() => result.current.switchServer('videasy'));
  expect(result.current.providerProgress).toBeNull();
  unmount();
  frame.remove();
});
