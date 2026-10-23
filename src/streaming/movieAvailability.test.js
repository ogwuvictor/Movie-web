import { isMovieReleased, readMovieAvailability } from './movieAvailability';

const now = new Date(2026, 9, 23, 12);
const movie = { id: 550, status: 'Released', release_date: '2000-01-01' };
const record = { available: true, serverIds: ['vidlink', 'videasy'], checkedAt: new Date(now.getTime() - 1000).toISOString(), expiresAt: new Date(now.getTime() + 60000).toISOString() };
const read = (overrides = {}, selection = movie) => readMovieAvailability(selection, { movies: { 550: { ...record, ...overrides } } }, now);

test('released status and a current title confirmation allow only listed enabled sources', () => {
  expect(read()).toMatchObject({ serverIds: ['vidlink', 'videasy'] });
  expect(read({ serverIds: ['demo', 'missing', 'vidfast'] })?.serverIds).toEqual(['vidfast']);
});

test.each([
  { release_date: '2026-10-24' }, { release_date: '' }, { release_date: '2026-02-30' },
  { status: 'Post Production' }, { status: 'Planned' }, { status: 'Canceled' },
])('an unreleased or invalid movie stays hidden: %j', overrides => {
  expect(isMovieReleased({ ...movie, ...overrides }, now)).toBe(false);
  expect(read({}, { ...movie, ...overrides })).toBeNull();
});

test('a release today is eligible, but still needs a source confirmation', () => {
  const today = { ...movie, release_date: '2026-10-23' };
  expect(isMovieReleased(today, now)).toBe(true);
  expect(readMovieAvailability(today, {}, now)).toBeNull();
});

test.each([
  { available: false }, { available: 'true' }, { serverIds: [] }, { serverIds: ['demo'] },
  { checkedAt: 'invalid' }, { expiresAt: 'invalid' }, { expiresAt: now.toISOString() },
  { checkedAt: new Date(now.getTime() + 1000).toISOString() },
  { expiresAt: new Date(now.getTime() + 86400000).toISOString() },
])('unconfirmed, expired or invalid source records stay hidden: %j', overrides => {
  expect(read(overrides)).toBeNull();
});
