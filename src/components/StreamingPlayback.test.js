import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StreamingPlayback from './StreamingPlayback';

test('explicitly labels the test clip and renders native playback in the existing ratio container', () => {
  const { container } = render(<StreamingPlayback sampleOnly selection={{ tmdbId: 550, mediaType: 'movie' }} title="Fixture film" />);
  expect(screen.getByText(/This is not Fixture film/)).toBeInTheDocument();
  const video = screen.getByLabelText('Open-license test video');
  expect(video).toHaveAttribute('controls');
  expect(video.parentElement).toHaveClass('ratio', 'ratio-16x9');
  fireEvent.canPlay(video);
  expect(screen.getByRole('status')).toHaveTextContent('Ready to play');
  fireEvent.playing(video);
  expect(screen.getByRole('status')).toHaveTextContent('Playing');
  fireEvent.error(video);
  expect(screen.getByRole('alert')).toHaveTextContent('Close and reopen Watch to retry');
  expect(container.querySelector('video')).toBeNull();
});
test('TV selection uses series/season/episode and resets on episode changes', () => {
  const { rerender } = render(<StreamingPlayback sampleOnly selection={{ tmdbId: 1399, mediaType: 'tv', season: 2, episode: 3 }} title="Fixture series" />);
  expect(screen.getByText(/season 2, episode 3/)).toBeInTheDocument();
  rerender(<StreamingPlayback sampleOnly selection={{ tmdbId: 1399, mediaType: 'tv', season: 2, episode: 4 }} title="Fixture series" />);
  expect(screen.getByText(/season 2, episode 4/)).toBeInTheDocument();
  expect(screen.getByLabelText('Open-license test video')).toBeInTheDocument();
});
test('provider mode opens VidLink, keeps iframe playback unverified and never substitutes the sample', () => {
  const { container } = render(<StreamingPlayback selection={{ tmdbId: 550, mediaType: 'movie' }} title="Fixture film" />);
  const frame = screen.getByTitle('Fixture film');
  expect(frame).toHaveAttribute('src', 'https://vidlink.pro/movie/550');
  expect(screen.getByRole('combobox', { name: 'Streaming server' })).toHaveValue('vidlink');
  fireEvent.load(frame);
  expect(screen.getByRole('status')).toHaveTextContent('playback not verified');
  expect(container.querySelector('video')).toBeNull();
  expect(screen.queryByLabelText('Open-license test video')).toBeNull();
});
test('provider mode generates the selected TV episode embed', () => {
  render(<StreamingPlayback selection={{ tmdbId: 1399, mediaType: 'tv', season: 2, episode: 3 }} title="Fixture series" />);
  expect(screen.getByTitle('Fixture series')).toHaveAttribute('src', 'https://vidlink.pro/tv/1399/2/3');
});
