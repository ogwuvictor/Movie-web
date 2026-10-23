const path = require('path');
const os = require('os');
const { request } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
(async () => {
  const client = await request.newContext({ timeout: 15000 });
  try {
    await Promise.all([
      ['VidLink', 'https://vidlink.pro'], ['Videasy', 'https://player.videasy.net'],
      ['Vidfast', 'https://vidfast.pro'], ['111Movies', 'https://111movies.net'],
    ].map(async ([provider, origin]) => {
      for (const suffix of ['/movie/550', '/tv/1399/2/3']) {
        const requested = origin + suffix + (provider === 'Vidfast' ? '?autoPlay=true&title=false&hideServer=true' : '');
        try {
          const response = await client.get(requested);
          const headers = response.headers();
          console.log(JSON.stringify({ provider, requested, finalUrl: response.url(), status: response.status(), contentType: headers['content-type'], xFrameOptions: headers['x-frame-options'] || null, csp: headers['content-security-policy'] || null, note: 'HTTP headers only; no video played or rights verified' }));
        } catch (error) { console.log(JSON.stringify({ provider, requested, error: error.message.split('\n')[0] })); }
      }
    }));
  } finally { await client.dispose(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
