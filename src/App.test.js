import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('existing About and Home navigation works with the patched router', async () => {
  const previousFetch = global.fetch;
  const previousMatchMedia = window.matchMedia;
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [], genres: [] }) });
  try {
    await act(async () => { render(<MemoryRouter initialEntries={['/about']}><App /></MemoryRouter>); });
    expect(screen.getByRole('heading', { name: 'About CineHub', exact: true })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getAllByRole('link', { name: 'Browse Movies', exact: true })[0]); });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Discover Amazing Movies', exact: true })).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'About', exact: true })); });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'About CineHub', exact: true })).toBeInTheDocument());
  } finally {
    global.fetch = previousFetch;
    window.matchMedia = previousMatchMedia;
  }
});
