import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import MovieDetails from './Moviedetails';

const reply = data => ({ ok: true, json: async () => data });
const movie = id => ({ id, title: `Movie ${id}`, genres: [], vote_average: 8 });
function Fixture() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate('/moviedetails/551')}>Select movie 551</button>
    <Routes><Route path="/moviedetails/:id" element={<MovieDetails />} /></Routes></>;
}
const mount = () => render(<MemoryRouter initialEntries={['/moviedetails/550']}><Fixture /></MemoryRouter>);
beforeEach(() => {
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
});
afterEach(() => { delete global.fetch; });

test('late metadata for a previous movie cannot replace the new title or its streaming ID', async () => {
  let finishOld;
  let oldSignal;
  global.fetch = jest.fn((url, options) => {
    if (url.includes('/movie/550?')) {
      oldSignal = options.signal;
      // Deliberately ignore abort to model a response already being processed.
      return new Promise(resolve => { finishOld = () => resolve(reply(movie(550))); });
    }
    if (url.includes('/movie/551?')) return Promise.resolve(reply(movie(551)));
    return Promise.resolve(reply({ results: [], success: true, is_public_domain: false }));
  });
  mount();
  await waitFor(() => expect(finishOld).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: 'Select movie 551' }));
  await screen.findByRole('heading', { name: 'Movie 551', exact: true });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { finishOld(); });
  expect(screen.queryByRole('heading', { name: 'Movie 550', exact: true })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Watch Now/ }));
  expect(screen.getByTitle('Movie 551')).toHaveAttribute('src', 'https://vidlink.pro/movie/551');
  fireEvent.change(screen.getByRole('combobox', { name: 'Streaming server' }), { target: { value: 'videasy' } });
  expect(screen.getByTitle('Movie 551')).toHaveAttribute('src', 'https://player.videasy.net/movie/551');
});

test('changing movies unmounts the previous player before the new metadata arrives', async () => {
  let finishNew;
  global.fetch = jest.fn(url => {
    if (url.includes('/movie/550?')) return Promise.resolve(reply(movie(550)));
    if (url.includes('/movie/551?')) return new Promise(resolve => { finishNew = () => resolve(reply(movie(551))); });
    return Promise.resolve(reply({ results: [], success: true, is_public_domain: false }));
  });
  const { container } = mount();
  fireEvent.click(await screen.findByRole('button', { name: /Watch Now/ }));
  expect(screen.getByTitle('Movie 550')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select movie 551' }));
  expect(container.querySelector('iframe')).toBeNull();
  expect(screen.queryByRole('button', { name: /Watch Now/ })).toBeNull();
  await act(async () => { finishNew(); });
  fireEvent.click(await screen.findByRole('button', { name: /Watch Now/ }));
  expect(screen.getByTitle('Movie 551')).toHaveAttribute('src', 'https://vidlink.pro/movie/551');
});

test('mismatched metadata is rejected instead of opening another movie', async () => {
  global.fetch = jest.fn(async () => reply(movie(551)));
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('does not match the selected movie');
  expect(screen.queryByRole('button', { name: /Watch Now/ })).toBeNull();
});
