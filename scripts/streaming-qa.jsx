import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import useStreaming from '../src/hooks/useStreaming';
import { CC0_DEMO_VIDEO } from '../src/streaming/streamingServers';

// Synthetic metadata only: this clip is never associated with a real TMDB title.
const fixtureId = 9007199254740000;
const sources = ['qa-cc0-a', 'qa-cc0-b'].map(id => ({
  id, type: 'video', enabled: true, verified: true,
  supports: ({ tmdbId }) => tmdbId === fixtureId,
  buildUrl: () => CC0_DEMO_VIDEO,
}));
function Harness() {
  const [mediaType, setMediaType] = useState('movie');
  const stream = useStreaming({ tmdbId: fixtureId, mediaType, season: 2, episode: 3 }, sources);
  const [evidence, setEvidence] = useState({ time: 0, paused: true, readyState: 0 });
  const [browserError, setBrowserError] = useState('');
  const visible = stream.url && !['idle', 'error'].includes(stream.status);
  const observe = event => {
    const video = event.currentTarget;
    setEvidence({ time: video.currentTime, paused: video.paused, readyState: video.readyState });
  };
  return <main>
    <h1>Isolated playback QA</h1>
    <p>CC0 flower test clip only. No movies or TV episodes are served by this harness.</p>
    <p>Both source IDs use the same file; switching tests state management, not independent provider redundancy.</p>
    <button onClick={() => { setBrowserError(''); stream.start(); }}>Load sample</button>
    <button onClick={async () => {
      try { await stream.videoRef.current?.play(); } catch (error) { setBrowserError(error.message); }
    }}>Play</button>
    <button onClick={() => stream.videoRef.current?.pause()}>Pause</button>
    <button onClick={async () => {
      try {
        const video = stream.videoRef.current;
        if (!video) throw new Error('Load the sample first.');
        if (video.requestFullscreen) await video.requestFullscreen();
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
        else throw new Error('Fullscreen is unavailable in this browser.');
      } catch (error) { setBrowserError(error.message); }
    }}>Fullscreen</button>
    <button onClick={() => stream.switchServer(stream.source?.id === sources[0].id ? sources[1].id : sources[0].id)}>Switch test source</button>
    <button onClick={() => setMediaType(value => value === 'movie' ? 'tv' : 'movie')}>Toggle movie/TV metadata fixture</button>
    <button onClick={() => {
      const video = stream.videoRef.current;
      if (video) { video.src = '/unavailable.mp4'; video.load(); }
    }}>Trigger real media error</button>
    <button onClick={stream.close}>Close</button>
    <p>Metadata fixture: {mediaType}; synthetic ID {fixtureId}; TV season 2, episode 3.</p>
    <p role="status">Hook status: {stream.status}; source: {stream.source?.id || 'none'}</p>
    {visible && <video key={`${stream.source.id}:${stream.url}`} {...stream.videoProps}
      controls style={{ maxWidth: '100%' }} aria-label="CC0 test video"
      onTimeUpdate={event => { stream.videoProps.onTimeUpdate(event); observe(event); }}
      onPause={event => { stream.videoProps.onPause(event); observe(event); }} />}
    <pre>{JSON.stringify(evidence, null, 2)}</pre>
    {(stream.error || browserError) && <p role="alert">{stream.error || browserError}</p>}
    <p>Evidence requires moving video frames and increasing time. A loaded page or ready state alone is not a playback pass.</p>
    <a href="https://github.com/mdn/interactive-examples/blob/main/LICENSE">MDN sample license reference</a>
  </main>;
}
createRoot(document.getElementById('root')).render(<Harness />);
