import { CC0_DEMO_VIDEO } from './streamingServers';

// Explicit sample mode only. Never add this to PLAYBACK_SERVERS or use it as a
// fallback for a licensed movie/episode. Actual Chrome playback verified in QA.
export const TEST_VIDEO_SOURCES = Object.freeze([Object.freeze({
  id: 'cc0-test', name: 'MDN CC0 flower test clip', type: 'video',
  enabled: true, verified: true, testOnly: true,
  license: 'CC0-1.0', licenseUrl: 'https://github.com/mdn/interactive-examples/blob/main/LICENSE',
  supports: () => true,
  buildUrl: () => CC0_DEMO_VIDEO,
})]);
