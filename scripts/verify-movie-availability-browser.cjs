const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
      let movie = { id: 550, title: 'Availability fixture', status: 'Released', release_date: '2000-01-01', genres: [] };
      let catalog;
      let failed = false;
      let checks = 0;
      const validRecord = () => ({ available: true, serverIds: ['videasy'], checkedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() });
      await context.route('**/api.themoviedb.org/3/**', route => {
        const pathname = new URL(route.request().url()).pathname;
        const data = /\/movie\/550$/.test(pathname) ? movie : pathname.includes('/genre/') ? { genres: [] }
          : pathname.endsWith('/watch/providers') ? { results: { US: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } } } : { results: [] };
        return route.fulfill({ json: data });
      });
      await context.route('**/localhost:8000/**', route => route.fulfill({ json: { success: true, is_public_domain: false } }));
      await context.route('https://vidlink.pro/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Confirmed-source UI fixture; no actual movie playback claimed.</p>' }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // Availability gating was explicitly undone: Watch Now remains visible.
      await page.goto('http://127.0.0.1:4175/moviedetails/550');
      await page.getByRole('button', { name: /Where to Watch/ }).waitFor();
      assert(await page.getByRole('button', { name: /Watch Now/ }).isVisible());
      await context.route('**/streaming-availability.json', route => {
        checks++;
        return route.fulfill(failed ? { status: 503, json: {} } : { json: catalog });
      });
      for (const scenario of ['future', 'unreleased-status', 'unknown-date', 'unavailable', 'unknown-source', 'expired', 'network-error', 'confirmed']) {
        movie = { ...movie, release_date: '2000-01-01', status: 'Released' };
        const record = validRecord();
        failed = scenario === 'network-error';
        if (scenario === 'future') movie.release_date = '2999-01-01';
        if (scenario === 'unreleased-status') movie.status = 'Post Production';
        if (scenario === 'unknown-date') movie.release_date = '';
        if (scenario === 'unavailable') record.available = false;
        if (scenario === 'expired') record.expiresAt = new Date(Date.now() - 1).toISOString();
        catalog = { movies: scenario === 'unknown-source' ? {} : { 550: record } };
        const before = checks;
        await page.goto('http://127.0.0.1:4175/moviedetails/550');
        await page.getByRole('button', { name: /Where to Watch/ }).waitFor();
        assert.equal(checks, before);
        // A round trip after metadata has settled lets the promise handlers commit.
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert(await page.getByRole('link', { name: /Play Trailer/ }).isVisible());
        await page.getByRole('button', { name: /Watch Now/ }).click();
        assert.equal(await page.locator('iframe').getAttribute('src'), 'https://vidlink.pro/movie/550');
        assert.equal(await page.getByRole('combobox', { name: 'Streaming server' }).locator('option').count(), 4);
        await page.getByRole('button', { name: 'Close player' }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      }
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, watchNowRestoredForAllMovieStates: true, availabilityDoesNotGateButton: true, trailerAndWhereToWatchPreserved: true }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
