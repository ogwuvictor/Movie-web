import React, { useEffect, useMemo } from 'react';
import useStreaming from '../hooks/useStreaming';
import { TEST_VIDEO_SOURCES } from '../streaming/testVideoSource';
import { PLAYBACK_SERVERS } from '../streaming/streamingServers';

/** Only the media viewport inside the existing Watch modal. No modal redesign. */
export default function StreamingPlayback({ selection, title, sampleOnly = false, availableServerIds }) {
  const sources = useMemo(() => sampleOnly ? TEST_VIDEO_SOURCES :
    availableServerIds ? PLAYBACK_SERVERS.filter(server => availableServerIds.includes(server.id)) : PLAYBACK_SERVERS,
  [sampleOnly, availableServerIds]);
  const stream = useStreaming(selection, sources);
  const { start } = stream;
  useEffect(() => { start(); }, [start]);
  const visible = stream.url && !['idle', 'error'].includes(stream.status);
  const labels = {
    idle: 'Preparing player...', loading: 'Loading video...', ready: 'Ready to play',
    playing: 'Playing', paused: 'Paused', buffering: 'Buffering...', ended: 'Playback ended',
    'embedded-unverified': 'Embedded page loaded; playback not verified',
  };
  const formatTime = seconds => {
    const total = Math.floor(seconds);
    return total >= 3600
      ? `${Math.floor(total / 3600)}:${String(Math.floor(total / 60) % 60).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
      : `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  return <>
    {sampleOnly && <p className="text-secondary">
      Open-license test video (CC0 flower clip). This is not {title || 'the selected title'}
      {selection.mediaType === 'tv' ? `, season ${selection.season}, episode ${selection.episode}` : ''}.
      {' '}Full movie and TV playback requires an authorized source.
    </p>}
    {!sampleOnly && stream.sources.length > 1 && <label className="form-label d-block streaming-server-control">
      Streaming server
      <select className="form-select bg-dark text-white border-secondary"
        aria-label="Streaming server" value={stream.source?.id || ''}
        onChange={event => stream.switchServer(event.target.value)}>
        {!stream.source && <option value="" disabled>Select a server</option>}
        {stream.sources.map(server => <option key={server.id} value={server.id}>{server.name}</option>)}
      </select>
    </label>}
    {visible && <div className="ratio ratio-16x9 streaming-viewport">
      {stream.source.type === 'video'
        ? <video key={`${stream.source.id}:${stream.url}`} {...stream.videoProps} controls aria-label={sampleOnly ? 'Open-license test video' : title} />
        : <iframe key={`${stream.source.id}:${stream.url}`} {...stream.iframeProps} title={title || 'Video player'} />}
    </div>}
    {stream.error
      ? <p className="alert alert-warning" role="alert">{stream.error} Close and reopen Watch to retry.</p>
      : <p className="text-secondary mt-3" role="status">{labels[stream.status] || stream.status}</p>}
    {stream.providerProgress && <p className="text-secondary" aria-label="Playback time">
      {formatTime(stream.providerProgress.currentTime)} / {formatTime(stream.providerProgress.duration)}
    </p>}
    {!sampleOnly && <p className="text-secondary">If the video does not play, choose another streaming server above. Availability depends on the provider.</p>}
    {!sampleOnly && <p className="text-secondary">For subtitle language, use the CC or settings menu inside the video. Subtitles printed into the video cannot be switched off.</p>}
    <p className="text-secondary streaming-rotation-hint">For a larger picture on your phone, turn it sideways and use the video&apos;s fullscreen button.</p>
  </>;
}
