import { useEffect, useState } from 'react';
import { isMovieReleased, readMovieAvailability } from '../streaming/movieAvailability';

export default function useMovieAvailability(movie) {
  const { id, release_date: releaseDate, status } = movie || {};
  const identity = JSON.stringify([id, releaseDate, status]);
  const [result, setResult] = useState(null);
  useEffect(() => {
    let active = true;
    let expiryTimer;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    setResult(null);
    const selection = { id, release_date: releaseDate, status };
    if (isMovieReleased(selection)) {
      const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const backend = process.env.REACT_APP_BACKEND_URL || (local ? 'http://127.0.0.1:8000' : '');
      const endpoint = process.env.REACT_APP_STREAM_AVAILABILITY_URL || `${backend}/api/streaming-availability.php`;
      fetch(endpoint, { cache: 'no-store', signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error('Availability check failed');
          return response.json();
        })
        .then(catalog => {
          if (!active) return;
          const availability = readMovieAvailability(selection, catalog);
          if (!availability) return;
          setResult({ identity, ...availability });
          expiryTimer = setTimeout(() => { if (active) setResult(null); }, availability.expiresAt - Date.now());
        })
        .catch(() => { /* Unknown, blocked and unavailable sources keep Watch Now hidden. */ })
        .finally(() => clearTimeout(timeout));
    }
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
      clearTimeout(expiryTimer);
    };
  }, [id, releaseDate, status, identity]);
  return result?.identity === identity && result.expiresAt > Date.now() && isMovieReleased(movie) ? result : null;
}
