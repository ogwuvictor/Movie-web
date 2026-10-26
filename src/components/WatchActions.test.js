import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MovieDetails from './Moviedetails';
import TVShowDetails from './TVShowDetails';

let hasProviders;
let movieOverrides;
let availabilityRecord;
beforeEach(() => {
  hasProviders = true;
  movieOverrides = {};
  availabilityRecord = { available: true, serverIds: ['vidlink', 'videasy'], checkedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() };
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  global.fetch = jest.fn(async url => {
    let data = { results: [] };
    if (url.includes('streaming-availability.json')) data = { movies: { 550: availabilityRecord } };
    else if (url.includes('api/check.php')) data = { success: true, is_public_domain: false };
    else if (url.includes('/watch/providers')) data = { results: hasProviders ? { US: { flatrate: [{ provider_name: 'Netflix', provider_id: 8 }] } } : {} };
    else if (url.includes('/season/2')) data = { episodes: [{ id: 98765, season_number: 2, episode_number: 3, name: 'Fixture episode' }] };
    else if (url.includes('/movie/550?')) data = { id: 550, title: 'Fixture film', vote_average: 8, genres: [], status: 'Released', release_date: '2000-01-01', ...movieOverrides };
    else if (url.includes('/tv/1399?')) data = { id: 1399, name: 'Fixture series', vote_average: 8, genres: [], seasons: [{ id: 22, name: 'Season 2', season_number: 2, episode_count: 1 }] };
    return { ok: true, json: async () => data };
  });
});
afterEach(() => { delete global.fetch; });

function Details({ tv = false }) {
  return <MemoryRouter initialEntries={[tv ? '/tv/1399' : '/moviedetails/550']}>
    <Routes><Route path={tv ? '/tv/:id' : '/moviedetails/:id'} element={tv ? <TVShowDetails /> : <MovieDetails />} /></Routes>
  </MemoryRouter>;
}

test('Where to Watch restores provider links; Watch Now alone opens the streaming player', async () => {
  const { container } = render(<Details />);
  fireEvent.click(await screen.findByRole('button', { name: /Where to Watch/ }));
  expect(screen.getByRole('link', { name: 'Find on Netflix' })).toHaveAttribute('href', '/out/netflix?title=Fixture%20film&id=550');
  expect(container.querySelector('iframe')).toBeNull();
  fireEvent.click(container.querySelector('.modal-header .btn-close'));
  fireEvent.click(await screen.findByRole('button', { name: /Watch Now/ }));
  const player = screen.getByRole('dialog', { name: 'Watch now: Fixture film' });
  expect(within(player).queryByRole('link', { name: 'Find on Netflix' })).toBeNull();
  expect(screen.getByTitle('Fixture film')).toHaveAttribute('src', 'https://vidlink.pro/movie/550');
  fireEvent.click(screen.getByRole('radio', { name: 'Videasy' }));
  expect(screen.getByTitle('Fixture film')).toHaveAttribute('src', 'https://player.videasy.net/movie/550');
});

test('TV episode rows open Watch Now with series ID and exact episode, independently of provider modal', async () => {
  const { container } = render(<Details tv />);
  fireEvent.click(await screen.findByRole('button', { name: /Fixture episode/ }));
  expect(screen.getByTitle('Fixture series')).toHaveAttribute('src', 'https://vidlink.pro/tv/1399/2/3');
  fireEvent.click(screen.getByRole('button', { name: 'Close player' }));
  fireEvent.click(await screen.findByRole('button', { name: /Where to Watch/ }));
  expect(screen.getByRole('link', { name: 'Find on Netflix' })).toBeInTheDocument();
  expect(container.querySelector('iframe')).toBeNull();
});

test('original unavailable-provider state is preserved while Watch Now remains separate', async () => {
  hasProviders = false;
  render(<Details />);
  expect(await screen.findByRole('button', { name: /Not available in your region/ })).toBeDisabled();
  expect(await screen.findByRole('button', { name: /Watch Now/ })).toBeEnabled();
});

test.each([
  ['upcoming', { release_date: '2999-01-01', status: 'Post Production' }, true],
  ['unreleased despite an old date', { status: 'In Production' }, true],
  ['missing release date', { release_date: '' }, true],
  ['unavailable file', {}, false],
  ['unknown availability', {}, null],
])('Watch Now remains available for %s after undoing the availability gate', async (_, overrides, available) => {
  movieOverrides = overrides;
  availabilityRecord = available === null ? null : { ...availabilityRecord, available };
  render(<Details />);
  await screen.findByRole('link', { name: /Play Trailer/ });
  await screen.findByRole('button', { name: /Where to Watch/ });
  expect(screen.getByRole('button', { name: /Watch Now/ })).toBeEnabled();
});
