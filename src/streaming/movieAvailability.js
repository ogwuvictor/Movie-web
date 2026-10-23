import { getPlaybackSources } from './streamingServers';

const MAX_CONFIRMATION_AGE = 24 * 60 * 60 * 1000;

export function isMovieReleased(movie, now = new Date()) {
  if (!movie?.id || !/^\d{4}-\d{2}-\d{2}$/.test(movie.release_date || '')) return false;
  const release = new Date(`${movie.release_date}T00:00:00Z`);
  if (!Number.isFinite(release.getTime()) || release.toISOString().slice(0, 10) !== movie.release_date) return false;
  if (movie.status && movie.status !== 'Released') return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return movie.release_date <= today;
}

// A released date or an iframe load is not a title-level playback check.
// Records must come from a maintained catalog or a provider availability API.
export function readMovieAvailability(movie, catalog, now = new Date()) {
  if (!isMovieReleased(movie, now)) return null;
  const record = catalog?.movies?.[String(movie.id)];
  if (record?.available !== true || !Array.isArray(record.serverIds)) return null;
  const checkedAt = Date.parse(record.checkedAt);
  const expiresAt = Date.parse(record.expiresAt);
  const time = now.getTime();
  if (!Number.isFinite(checkedAt) || !Number.isFinite(expiresAt) || checkedAt > time ||
      expiresAt <= time || expiresAt <= checkedAt || expiresAt - checkedAt > MAX_CONFIRMATION_AGE ||
      time - checkedAt > MAX_CONFIRMATION_AGE) return null;
  let enabled;
  try { enabled = getPlaybackSources({ tmdbId: movie.id, mediaType: 'movie' }); }
  catch { return null; }
  const serverIds = enabled.filter(server => record.serverIds.includes(server.id)).map(server => server.id);
  return serverIds.length ? { serverIds, expiresAt } : null;
}
