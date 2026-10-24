import { useCallback, useEffect, useRef, useState } from 'react';

const API = 'https://api.themoviedb.org/3';
const API_KEY = '8f666adc99ee1f6168974514ff6d951a';

export default function useGenreCatalog(mediaType, genreId) {
  const [items, setItems] = useState([]);
  const [genreName, setGenreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const request = useRef(null);
  const sentinelRef = useRef(null);
  const key = `${mediaType}:${genreId}`;

  const loadMore = useCallback(async () => {
    const current = request.current;
    if (!current || current.key !== key || !current.active || current.busy || !current.hasMore) return;
    current.busy = true;
    setLoading(true);
    setError(null);
    const page = current.page + 1;
    try {
      const params = new URLSearchParams({ api_key: API_KEY, with_genres: genreId, language: 'en-US', sort_by: 'popularity.desc', page });
      const response = await fetch(`${API}/discover/${mediaType}?${params}`, { signal: current.controller.signal });
      if (!response.ok) throw new Error('Genre request failed');
      const data = await response.json();
      if (!Array.isArray(data.results) || !Number.isInteger(data.total_pages)) throw new Error('Invalid genre response');
      if (!current.active) return;
      current.page = page;
      current.hasMore = data.results.length > 0 && page < Math.min(data.total_pages, 500);
      setItems(previous => {
        const seen = new Set(previous.map(item => item.id));
        return [...previous, ...data.results.filter(item => item && Number.isInteger(item.id) && item.id > 0 && !seen.has(item.id) && seen.add(item.id))];
      });
      setHasMore(current.hasMore);
    } catch (failure) {
      if (current.active && failure.name !== 'AbortError') setError('Unable to load titles. Please try again.');
    } finally {
      current.busy = false;
      if (current.active) setLoading(false);
    }
  }, [key, genreId, mediaType]);

  useEffect(() => {
    const current = { key, page: 0, busy: false, hasMore: true, active: true, controller: new AbortController() };
    request.current = current;
    setItems([]);
    setGenreName('');
    setError(null);
    setHasMore(true);
    if (!/^\d+$/.test(String(genreId)) || Number(genreId) < 1) {
      setError('Invalid genre.');
      setLoading(false);
      current.hasMore = false;
      setHasMore(false);
    } else {
      loadMore();
      fetch(`${API}/genre/${mediaType}/list?api_key=${API_KEY}&language=en`, { signal: current.controller.signal })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (current.active) setGenreName(data?.genres?.find(genre => String(genre.id) === String(genreId))?.name || 'Genre');
        }).catch(() => { if (current.active) setGenreName('Genre'); });
    }
    return () => { current.active = false; current.controller.abort(); };
  }, [key, genreId, mediaType, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || error || !hasMore) return;
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) loadMore();
      }, { rootMargin: '400px' });
      observer.observe(sentinel);
      return () => observer.disconnect();
    }
    const onScroll = () => { if (sentinel.getBoundingClientRect().top < window.innerHeight + 400) loadMore(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [loading, error, hasMore, loadMore]);

  return { items, genreName, loading, error, hasMore, loadMore, sentinelRef };
}
