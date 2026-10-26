import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TVShowDetails from './TVShowDetails';

let failSeason;
beforeEach(() => {
  failSeason = false;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  global.fetch = jest.fn(async url => {
    let body = { results: [] };
    const season = url.match(/\/season\/(\d+)/)?.[1];
    if (season) {
      if (failSeason && season === '2') return { ok: false };
      body = { episodes: Array.from({ length: 14 }, (_, i) => ({ id: Number(season) * 1000 + i + 1, episode_number: i + 1, name: `Season ${season} episode ${i + 1}` })) };
    } else if (url.includes('/tv/1399?')) body = { id: 1399, name: 'Long series', seasons: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, season_number: i + 1, name: `Season ${i + 1}`, episode_count: 14 })) };
    return { ok: true, json: async () => body };
  });
});
afterEach(() => { delete global.fetch; });
const mount = () => render(<MemoryRouter initialEntries={['/tv/1399']}><Routes><Route path="/tv/:id" element={<TVShowDetails />} /></Routes></MemoryRouter>);

test('long series exposes all seasons but only six episodes per page, with correct playback IDs', async () => {
  mount();
  await screen.findByRole('button', { name: /^1 Season 1 episode 1 / });
  expect(screen.getAllByRole('option')).toHaveLength(31);
  expect(screen.getAllByRole('button', { name: /Season 1 episode/ })).toHaveLength(6);
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('Episodes 7–12 of 14')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^7 Season 1 episode 7 / }));
  expect(screen.getByTitle('Long series')).toHaveAttribute('src', 'https://vidlink.pro/tv/1399/1/7');
  fireEvent.click(screen.getByRole('button', { name: 'Close player' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Season' }), { target: { value: '30' } });
  expect(await screen.findByRole('button', { name: /^1 Season 30 episode 1 / })).toBeInTheDocument();
  expect(screen.getByText('Episodes 1–6 of 14')).toBeInTheDocument();
});

test('failed season request offers retry instead of an endless loading state', async () => {
  mount();
  await screen.findByRole('button', { name: /^1 Season 1 episode 1 / });
  failSeason = true;
  fireEvent.change(screen.getByRole('combobox', { name: 'Season' }), { target: { value: '2' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load episodes');
  failSeason = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('button', { name: /^1 Season 2 episode 1 / })).toBeInTheDocument();
});
