import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildStreamUrl, getPlaybackSources, PLAYBACK_SERVERS } from '../streaming/streamingServers';

/** Playback state only: the caller owns all presentation and existing controls. */
export default function useStreaming(selection, servers = PLAYBACK_SERVERS) {
  const { tmdbId, mediaType = 'movie', season, episode } = selection;
  const [attempt, setAttempt] = useState({ key: '', index: 0, status: 'idle', error: '' });
  const key = JSON.stringify([tmdbId, mediaType, season, episode]);
  const currentKey = useRef(key);
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const [providerProgress, setProviderProgress] = useState(null);
  const generationRef = useRef(0);
  const generation = attempt.generation;
  currentKey.current = key;
  const sources = useMemo(() => {
    try { return getPlaybackSources({ tmdbId, mediaType, season, episode }, servers); }
    catch { return []; }
  }, [tmdbId, mediaType, season, episode, servers]);
  const active = attempt.key === key && attempt.status !== 'idle';
  const index = active ? attempt.index : 0;
  const source = active ? sources[index] : null;
  let url = '';
  let urlError = '';
  if (source) {
    try { url = buildStreamUrl({ serverId: source.id, tmdbId, mediaType, season, episode, servers }); }
    catch (error) { urlError = error.message; }
  }
  const start = useCallback(() => {
    let error = '';
    try {
      if (!getPlaybackSources({ tmdbId, mediaType, season, episode }, servers).length) {
        error = 'No enabled streaming source is configured for this title.';
      }
    } catch (failure) { error = failure.message; }
    const nextGeneration = ++generationRef.current;
    setAttempt({ key, generation: nextGeneration, index: 0, status: error ? 'error' : 'loading', error });
  }, [key, tmdbId, mediaType, season, episode, servers]);
  const fail = useCallback((message = 'The source could not initialize playback.') => {
    if (currentKey.current !== key || generationRef.current !== generation) return;
    setAttempt(previous => {
      if (previous.key !== key || previous.index !== index || previous.status === 'error') return previous;
      return index + 1 < sources.length
        ? { key, generation, index: index + 1, status: 'loading', error: '' }
        : { ...previous, status: 'error', error: message };
    });
  }, [key, generation, index, sources.length]);
  const mark = useCallback(status => {
    if (currentKey.current !== key || generationRef.current !== generation) return;
    setAttempt(previous => previous.key === key && previous.index === index && previous.status !== 'error'
      ? { ...previous, status } : previous);
  }, [key, generation, index]);
  useEffect(() => {
    if (active && urlError) fail(urlError);
  }, [active, urlError, fail]);
  useEffect(() => {
    if (active && !source) fail('No enabled streaming source remains available.');
  }, [active, source, fail]);
  useEffect(() => {
    if (!active || !['loading', 'buffering'].includes(attempt.status) || !url) return undefined;
    const timer = setTimeout(() => fail('Playback initialization timed out.'), 20000);
    return () => clearTimeout(timer);
  }, [active, attempt.status, url, fail]);
  const progressIdentity = `${key}:${generation}:${source?.id || ''}`;
  useEffect(() => {
    // VidLink's documented PLAYER_EVENT API. Do not inspect cross-origin DOM
    // or trust messages from unrelated windows, origins, titles or episodes.
    if (!active || source?.id !== 'vidlink' || !url || attempt.status === 'error') return undefined;
    const origin = new URL(url).origin;
    const receive = event => {
      if (generationRef.current !== generation || event.origin !== origin ||
        !iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data?.type === 'PLAYER_EVENT' ? event.data.data : null;
      if (!data || data.mediaType !== mediaType || Number(data.mtmdbId ?? data.tmdbId) !== Number(tmdbId)) return;
      if (mediaType === 'tv' && (Number(data.season) !== Number(season) || Number(data.episode) !== Number(episode))) return;
      if (!['play', 'pause', 'seeked', 'ended', 'timeupdate'].includes(data.event)) return;
      if (!Number.isFinite(data.duration) || data.duration <= 0 ||
        !Number.isFinite(data.currentTime) || data.currentTime < 0 || data.currentTime > data.duration + 1) return;
      setProviderProgress({ identity: progressIdentity, currentTime: data.currentTime, duration: data.duration });
      if (data.event === 'play') mark('playing');
      if (data.event === 'pause') mark('paused');
      if (data.event === 'ended') mark('ended');
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [active, source?.id, url, attempt.status, generation, progressIdentity, mediaType, tmdbId, season, episode, mark]);
  const resumeKey = `moviesync:resume:${key}:${source?.id || ''}`;
  const saveProgress = event => {
    const video = event.currentTarget;
    if (!Number.isFinite(video.currentTime) || video.currentTime < 0) return;
    try { localStorage.setItem(resumeKey, String(video.ended ? 0 : video.currentTime)); }
    catch { /* Playback remains usable when storage is disabled or full. */ }
  };
  return {
    available: sources.length > 0, sources, source, url,
    status: active ? attempt.status : 'idle', error: active ? attempt.error : '',
    start, fail, mark,
    videoRef, iframeRef,
    providerProgress: providerProgress?.identity === progressIdentity ? providerProgress : null,
    // Spread only on a native <video>; no controls or styling are imposed.
    videoProps: {
      ref: videoRef, src: url || undefined, playsInline: true, preload: 'metadata',
      onCanPlay: () => mark('ready'), onPlaying: () => mark('playing'),
      onError: () => fail('Video unavailable, blocked, unsupported, or interrupted by a network error.'),
      onWaiting: () => mark('buffering'),
      onTimeUpdate: saveProgress,
      onPause: event => { saveProgress(event); mark('paused'); },
      onEnded: event => { saveProgress(event); mark('ended'); },
      onLoadedMetadata: event => {
        const video = event.currentTarget;
        try {
          const saved = Number(localStorage.getItem(resumeKey));
          if (Number.isFinite(saved) && saved > 0 && saved < video.duration - 2) video.currentTime = saved;
        } catch { /* Seeking/storage may be restricted. */ }
      },
    },
    // iframe load confirms navigation only, never actual media playback.
    iframeProps: {
      ref: iframeRef,
      src: url || undefined, allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
      allowFullScreen: true, referrerPolicy: 'strict-origin-when-cross-origin',
      onLoad: () => mark('embedded-unverified'),
      onError: () => fail('The embedded source could not load.'),
    },
    close: () => {
      ++generationRef.current;
      setAttempt({ key: '', index: 0, status: 'idle', error: '' });
    },
    // Configuration-driven switching; no new selector is required.
    switchServer: serverId => {
      const next = sources.findIndex(server => server.id === serverId);
      if (next >= 0) {
        const nextGeneration = ++generationRef.current;
        setAttempt({ key, generation: nextGeneration, index: next, status: 'loading', error: '' });
      }
    },
  };
}
