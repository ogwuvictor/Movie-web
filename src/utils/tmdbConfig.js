/**
 * Central TMDB configuration.
 *
 * Set REACT_APP_TMDB_API_KEY / REACT_APP_TMDB_READ_TOKEN in your environment
 * (or .env.local) to override the built-in values. The built-in values are
 * kept as fallbacks so existing deployments keep working; prefer env vars so
 * keys can be rotated without a code change.
 */
export const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY || '8f666adc99ee1f6168974514ff6d951a';
export const TMDB_READ_TOKEN = process.env.REACT_APP_TMDB_READ_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkNzMwNGM2OGM4OTM3NWE4NjQxMGMwNDFjOGZkMTEyOSIsIm5iZiI6MTY4NzI3NjY4MC40MTIsInN1YiI6IjY0OTFjYzg4MmY4ZDA5MDBhZDM2OTg1NSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.9e03g3QbaeXbYPt9FOYxZ37l9UpAxngkTnaHcYzmcW0';

export const TMDB_API_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
export const TMDB_NO_POSTER = 'https://placehold.co/500x750/2a2a2a/FFFFFF?text=No+Poster';

export const tmdbUrl = (path, params = {}) => {
  const search = typeof params === 'string'
    ? `api_key=${TMDB_API_KEY}&${params}`
    : new URLSearchParams({ api_key: TMDB_API_KEY, ...params }).toString();
  return `${TMDB_API_BASE}/${path}?${search}`;
};

export const tmdbPoster = (posterPath, size = 'w500') =>
  posterPath ? `${TMDB_IMAGE_BASE}/${size}${posterPath}` : TMDB_NO_POSTER;

/** Display title for a TMDB movie or TV result. */
export const tmdbTitle = (item) => item.title || item.name || '';

/** Detail-page path for a TMDB movie or TV result. */
export const tmdbDetailPath = (mediaType, id) =>
  mediaType === 'tv' ? `/tv/${id}` : `/moviedetails/${id}`;

/** TMDB v4 Authorization header value, or null if no token is configured. */
export const tmdbAuthHeaders = () =>
  TMDB_READ_TOKEN ? { Authorization: `Bearer ${TMDB_READ_TOKEN}` } : {};