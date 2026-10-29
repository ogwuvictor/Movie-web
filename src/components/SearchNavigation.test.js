import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import App from '../App';

function Back() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Browser Back</button>;
}
let previousScrollTo;
beforeEach(() => {
  previousScrollTo = window.scrollTo;
  window.scrollTo = jest.fn();
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  global.fetch = jest.fn(async url => {
    let body = { results: [], genres: [] };
    if (url.includes('/search/multi')) body = { results: [
      { id: 550, title: 'Fixture film', media_type: 'movie', popularity: 10 },
      { id: 1399, name: 'Fixture series', media_type: 'tv', popularity: 8 },
    ] };
    else if (url.includes('/movie/550?')) body = { id: 550, title: 'Fixture film', genres: [] };
    else if (url.includes('/tv/1399?')) body = { id: 1399, name: 'Fixture series', genres: [], seasons: [] };
    return { ok: true, status: 200, json: async () => body };
  });
});
afterEach(() => { delete global.fetch; window.scrollTo = previousScrollTo; });

test.each(['film', 'series'])('opening a %s result stays on details after debounce and Back restores the query', async type => {
  render(<MemoryRouter initialEntries={['/search?q=fixture']}><App /><Back /></MemoryRouter>);
  const card = await screen.findByRole('link', { name: new RegExp(`Fixture ${type}`) });
  // Reproduce leaving the page while a different search is still debouncing.
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: 'unfinished' } });
  fireEvent.click(card);
  expect(await screen.findByRole('heading', { name: `Fixture ${type}`, exact: true })).toBeInTheDocument();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); });
  expect(screen.getByRole('heading', { name: `Fixture ${type}`, exact: true })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Browser Back' }));
  expect(await screen.findByRole('heading', { name: 'Search Results for "fixture"' })).toBeInTheDocument();
  expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('fixture');
  expect(await screen.findByRole('link', { name: /Fixture film/ })).toBeInTheDocument();
});

test('search submit uses current input immediately before the debounce finishes', async () => {
  await act(async () => { render(<MemoryRouter initialEntries={['/about']}><App /></MemoryRouter>); });
  fireEvent.click(screen.getByRole('link', { name: 'Search movies and TV shows' }));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: 'fixture' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search titles' }));
  expect(await screen.findByRole('heading', { name: 'Search Results for "fixture"' })).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: /Fixture film/ })).toHaveAttribute('href', '/moviedetails/550');
});

test('Home search opens a dedicated empty page without requesting results until typing', async () => {
  await act(async () => { render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>); });
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Search movies and TV shows' }));
  expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument();
  expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveFocus();
  expect(screen.queryByRole('link', { name: 'Search movies and TV shows' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('searchbox')).toHaveLength(1);
  expect(screen.queryByText('Browse by Genre')).not.toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([url]) => url.includes('/search/multi'))).toBe(false);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: 'fixture' } });
  expect(await screen.findByRole('link', { name: /Fixture series/ })).toHaveAttribute('href', '/tv/1399');
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: '' } });
  expect(await screen.findByRole('heading', { name: 'Search' })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('link', { name: /Fixture series/ })).not.toBeInTheDocument());
});
