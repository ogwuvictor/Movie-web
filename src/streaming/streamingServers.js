/**
 * React/JavaScript port of MovieSync's Flutter streaming_servers.dart.
 *
 * External endpoints reflect the uploaded MovieSync source. They are NOT
 * verified working, may disallow browser framing, and may require rights.
 * Use only providers/content you are authorized to embed or distribute.
 */

export const CC0_DEMO_VIDEO =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const REFERENCE_SERVERS = [
  {
    id: 'demo',
    name: 'Demo video (CC0)',
    type: 'video',
    description: 'Known sample file: tests your React player, not a movie stream',
    color: '#26b69b',
    buildUrl: () => CC0_DEMO_VIDEO,
  },
  {
    id: 'vidlink',
    name: 'VidLink Pro',
    type: 'iframe',
    description: 'Third party; embedding and rights unverified',
    color: '#2196f3',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'tv'
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
        : `https://vidlink.pro/movie/${tmdbId}`,
  },
  {
    id: 'videasy',
    name: 'Videasy',
    type: 'iframe',
    description: 'Third party; embedding and rights unverified',
    color: '#9c27b0',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'tv'
        ? `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`
        : `https://player.videasy.net/movie/${tmdbId}`,
  },
  {
    id: 'vidfast',
    name: 'Vidfast',
    type: 'iframe',
    description: 'Third party; embedding and rights unverified',
    color: '#e91e63',
    buildUrl: ({ tmdbId, mediaType, season, episode }) => {
      const path = mediaType === 'tv'
        ? `tv/${tmdbId}/${season}/${episode}`
        : `movie/${tmdbId}`;
      return `https://vidfast.pro/${path}?autoPlay=true&title=false&hideServer=true`;
    },
  },
  {
    id: 'movies111',
    name: '111Movies',
    type: 'iframe',
    description: 'Third party; embedding and rights unverified',
    color: '#00bcd4',
    buildUrl: ({ tmdbId, mediaType, season, episode }) =>
      mediaType === 'tv'
        ? `https://111movies.net/tv/${tmdbId}/${season}/${episode}`
        : `https://111movies.net/movie/${tmdbId}`,
  },
];

// Explicit user opt-in enables these four unverified embeds. This records a
// configuration choice, not verification of playback or content rights.
export const STREAMING_SERVERS = Object.freeze(REFERENCE_SERVERS.map(server =>
  Object.freeze({ ...server, enabled: server.id !== 'demo', verified: false,
    allowUnverified: server.id !== 'demo',
    supports: ({ mediaType = 'movie' }) => server.id !== 'demo' && ['movie', 'tv'].includes(mediaType),
    disabledReason: server.id === 'demo' ? 'Test sample; not a TMDB title' : '' })
));

// Order determines the initial provider and fallback order. The sample remains
// excluded. Disable allowUnverified to restore the verification requirement.
export const PLAYBACK_SERVERS = STREAMING_SERVERS;

export function validateSelection({ tmdbId, mediaType = 'movie', season, episode }) {
  const integer = (value, minimum) =>
    (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) &&
    Number.isSafeInteger(Number(value)) && Number(value) >= minimum;
  if (!integer(tmdbId, 1)) throw new Error('tmdbId must be a positive integer');
  if (!['movie', 'tv'].includes(mediaType)) throw new Error('mediaType must be "movie" or "tv"');
  // TMDB season zero represents specials; episode numbers still start at one.
  if (mediaType === 'tv' && (!integer(season, 0) || !integer(episode, 1))) {
    throw new Error('TV season must be a nonnegative integer and episode a positive integer');
  }
}

export function getPlaybackSources(selection, servers = PLAYBACK_SERVERS) {
  validateSelection(selection);
  return servers.filter(server => server.enabled === true &&
    (server.verified === true || server.allowUnverified === true) &&
    server.id !== 'demo' && server.supports?.(selection) === true);
}

export function buildStreamUrl({
  serverId,
  tmdbId,
  mediaType = 'movie',
  season = 1,
  episode = 1,
  servers = STREAMING_SERVERS,
}) {
  validateSelection({ tmdbId, mediaType, season, episode });
  const server = servers.find((s) => s.id === serverId);
  if (!server) throw new Error(`Unknown streaming server: ${serverId}`);
  const url = server.buildUrl({
    tmdbId: Number(tmdbId),
    mediaType,
    season: Number(season),
    episode: Number(episode),
  });
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error('A streaming URL must use HTTPS without credentials');
  }
  return url;
}
