import { buildStreamUrl, getPlaybackSources, STREAMING_SERVERS, validateSelection } from './streamingServers';

const patterns = [
  ['vidlink', 'https://vidlink.pro/movie/550', 'https://vidlink.pro/tv/1399/2/3'],
  ['videasy', 'https://player.videasy.net/movie/550', 'https://player.videasy.net/tv/1399/2/3'],
  ['vidfast', 'https://vidfast.pro/movie/550?autoPlay=true&title=false&hideServer=true', 'https://vidfast.pro/tv/1399/2/3?autoPlay=true&title=false&hideServer=true'],
  ['movies111', 'https://111movies.net/movie/550', 'https://111movies.net/tv/1399/2/3'],
];
test.each(patterns)('%s preserves movie and episode URL patterns', (serverId, movie, tv) => {
  expect(buildStreamUrl({ serverId, tmdbId: '550' })).toBe(movie);
  expect(buildStreamUrl({ serverId, tmdbId: '1399', mediaType: 'tv', season: 2, episode: 3 })).toBe(tv);
});
test.each([undefined, null, '', ' ', true, [], {}, 0, -1, 1.5, '1/2', '1e2', Infinity])('rejects invalid TMDB ID %p', tmdbId => {
  expect(() => buildStreamUrl({ serverId: 'vidlink', tmdbId })).toThrow();
});
test.each([{ season: -1, episode: 1 }, { season: 1, episode: 0 }, { season: '', episode: 1 }, { season: 1, episode: true }])('rejects invalid episode selection %p', selection => {
  expect(() => validateSelection({ tmdbId: 1399, mediaType: 'tv', ...selection })).toThrow();
});
test('accepts TMDB specials without turning season zero into season one', () => {
  expect(buildStreamUrl({ serverId: 'vidlink', tmdbId: 1399, mediaType: 'tv', season: 0, episode: 1 })).toContain('/tv/1399/0/1');
});
test('rejects unknown media types and servers', () => {
  expect(() => buildStreamUrl({ serverId: 'missing', tmdbId: 1 })).toThrow();
  expect(() => buildStreamUrl({ serverId: 'vidlink', tmdbId: 1, mediaType: 'person' })).toThrow();
});
test.each(['http://example.com/video', 'javascript:alert(1)', 'https://user:secret@example.com/video'])('rejects unsafe stream URL %s', url => {
  expect(() => buildStreamUrl({ serverId: 'custom', tmdbId: 1, servers: [{ id: 'custom', buildUrl: () => url }] })).toThrow();
});
test('explicit opt-in enables the four unverified providers without enabling the demo', () => {
  expect(STREAMING_SERVERS).toHaveLength(5);
  const enabled = getPlaybackSources({ tmdbId: 550 });
  expect(enabled.map(server => server.id)).toEqual(['vidlink', 'videasy', 'vidfast', 'movies111']);
  expect(enabled.every(server => !server.verified && server.allowUnverified)).toBe(true);
  const servers = [{ id: 'owned', enabled: true, verified: true, supports: ({ tmdbId }) => tmdbId === 550 }];
  expect(getPlaybackSources({ tmdbId: 550 }, servers)).toEqual(servers);
  expect(getPlaybackSources({ tmdbId: 551 }, servers)).toEqual([]);
});
test('unverified sources without explicit opt-in remain excluded', () => {
  const source = { id: 'unreviewed', enabled: true, verified: false, supports: () => true };
  expect(getPlaybackSources({ tmdbId: 550 }, [source])).toEqual([]);
  expect(getPlaybackSources({ tmdbId: 550 }, [{ ...source, allowUnverified: true }])).toHaveLength(1);
  expect(getPlaybackSources({ tmdbId: 550 }, [{ ...source, enabled: false, allowUnverified: true }])).toEqual([]);
});
