const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 320, height: 844 }, { width: 390, height: 844 }, { width: 430, height: 844 }]) {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
      let providersAvailable = true;
      await context.route('**/api.themoviedb.org/3/**', route => {
        const pathname = new URL(route.request().url()).pathname;
        let data = { results: [] };
        if (pathname.endsWith('/watch/providers')) data = { results: providersAvailable ? { US: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } } : {} };
        else if (pathname.endsWith('/season/2')) data = { episodes: [{ id: 98765, season_number: 2, episode_number: 3, name: 'Fixture episode' }] };
        else if (pathname.endsWith('/season/3')) data = { episodes: [{ id: 98766, season_number: 3, episode_number: 1, name: 'Another episode' }] };
        else if (/\/movie\/550$/.test(pathname)) data = { id: 550, title: 'Fixture film', vote_average: 8, runtime: 120, genres: [], release_date: '2000-01-01', status: 'Released' };
        else if (/\/tv\/1399$/.test(pathname)) data = { id: 1399, name: 'Fixture series', vote_average: 8, genres: [], seasons: [{ id: 22, name: 'Season 2', season_number: 2, episode_count: 1 }, { id: 23, name: 'Season 3', season_number: 3, episode_count: 1 }] };
        return route.fulfill({ json: data });
      });
      await context.route('**/localhost:8000/**', route => route.fulfill({ json: { success: true, is_public_domain: false } }));
      // Mock embed documents to test app wiring, not third-party movie playback.
      for (const host of ['vidlink.pro', 'player.videasy.net', 'vidfast.pro', '111movies.net']) {
        await context.route(`https://${host}/**`, route => {
          const parts = new URL(route.request().url()).pathname.split('/');
          const payload = { type: 'PLAYER_EVENT', data: { event: 'pause', mtmdbId: Number(parts[2]), mediaType: parts[1],
            season: Number(parts[3]), episode: Number(parts[4]), currentTime: 60, duration: 7200 } };
          const report = host === 'vidlink.pro' ? `<script>setTimeout(() => parent.postMessage(${JSON.stringify(payload)}, 'http://127.0.0.1:4175'), 100)</script>` : '';
          return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Embed fixture</title><p>Provider document fixture; no video playback claimed.</p>' + report });
        });
      }
      await context.route('**/streaming-availability.json', route => route.fulfill({ json: { movies: { 550: { available: true, serverIds: ['vidlink', 'videasy', 'vidfast', 'movies111'], checkedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 600000).toISOString() } } } }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of ['/moviedetails/550', '/tv/1399']) {
        await page.goto(`http://127.0.0.1:4175${route}`, { waitUntil: 'load' });
        const where = page.getByRole('button', { name: /Where to Watch/ });
        const now = page.getByRole('button', { name: /Watch Now/ });
        await where.waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.locator('.movie-poster').evaluate(img => img.decode().catch(() => {}));
        if (viewport.width < 576 && route.startsWith('/moviedetails/')) {
          const actions = await page.locator('.movie-actions > *').evaluateAll(nodes => nodes.map(node => {
            const r = node.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          }));
          assert.equal(actions[0].y, actions[1].y, 'Trailer and Watch Now should sit side by side');
          assert(actions.every(box => box.width < viewport.width - 32 && box.height >= 44 && box.height <= 48));
          assert(actions.every(box => box.x >= 0 && box.x + box.width <= viewport.width));
          await page.screenshot({ path: path.join(os.tmpdir(), `cinehub-compact-movie-actions-${viewport.width}.png`), fullPage: true });
          console.log(JSON.stringify({ viewport, compactMovieActions: actions }));
        }
        assert.equal(await where.getAttribute('class'), 'netflix-info-btn');
        assert.equal(await now.getAttribute('class'), 'netflix-play-btn');
        await where.click();
        await page.locator('.modal-body a[href*="/out/netflix"]').waitFor();
        assert.equal(await page.locator('iframe,video,.streaming-server-control').count(), 0);
        await page.locator('.modal-header .btn-close').click();
        await now.click();
        const title = route.startsWith('/tv/') ? 'Fixture series' : 'Fixture film';
        const frame = page.getByTitle(title, { exact: true });
        const suffix = route.startsWith('/tv/') ? 'tv/1399/2/3' : 'movie/550';
        const selector = page.getByRole('group', { name: 'Streaming server' });
        await selector.waitFor();
        await page.getByLabel('Playback time').filter({ hasText: '1:00 / 2:00:00' }).waitFor();
        if (!route.startsWith('/tv/')) await page.getByText('Movie runtime (TMDB): 2h 0m').waitFor();
        assert.equal(await selector.getByRole('radio').count(), 4);
        assert.equal(await page.locator('.modal-body a[href*="/out/netflix"]').count(), 0);
        for (const [id, url] of [
          ['vidlink', `https://vidlink.pro/${suffix}`], ['videasy', `https://player.videasy.net/${suffix}`],
          ['vidfast', `https://vidfast.pro/${suffix}?autoPlay=true&title=false&hideServer=true`], ['movies111', `https://111movies.net/${suffix}`],
        ]) {
          await selector.locator(`input[value="${id}"]`).locator("..").click();
          await page.waitForFunction(expected => document.querySelector('iframe')?.src === expected, url);
          assert.equal(await frame.getAttribute('src'), url);
        }
        const box = await frame.boundingBox();
        assert(box.width <= viewport.width);
        await page.screenshot({ path: path.join(os.tmpdir(), `moviesync-watch-now-${viewport.width}-${route.startsWith('/tv/') ? 'tv' : 'movie'}.png`) });
        await page.getByRole('button', { name: 'Close player' }).click();
        assert.equal(await page.locator('iframe').count(), 0);
        if (route.startsWith('/tv/')) {
          await page.getByRole('button').filter({ hasText: 'Fixture episode' }).click();
          await selector.waitFor();
          assert.equal(await frame.getAttribute('src'), 'https://vidlink.pro/tv/1399/2/3');
          await page.getByRole('button', { name: 'Close player' }).click();
          await page.getByRole('button', { name: /Season 3/ }).click();
          await page.getByText('Another episode', { exact: true }).waitFor();
          await now.click();
          await selector.waitFor();
          assert.equal(await frame.getAttribute('src'), 'https://vidlink.pro/tv/1399/3/1');
          await page.getByRole('button', { name: 'Close player' }).click();
        }
        await page.getByRole('link', { name: /Play Trailer/ }).click();
        await page.getByText('No Official Trailer Available', { exact: true }).waitFor();
        await page.getByRole('link', { name: route.startsWith('/tv/') ? /Back to TV Show Details/ : /Back to Movie Details/ }).click();
        await where.waitFor();
        console.log(JSON.stringify({ viewport, route, whereToWatchRestored: true, watchNowSeparate: true, fourServerSelection: true, iframeFitsViewport: true, closeUnmountsPlayer: true, trailerNavigation: true, metadataAndEmbeds: 'mocked; not a video playback test' }));
      }
      providersAvailable = false;
      await page.goto('http://127.0.0.1:4175/moviedetails/550');
      await page.getByRole('button', { name: /Not available in your region/ }).waitFor();
      if (viewport.width < 576) {
        const unavailable = await page.getByRole('button', { name: /Not available in your region/ }).boundingBox();
        assert(unavailable.x + unavailable.width <= viewport.width);
      }
      assert(await page.getByRole('button', { name: /Not available in your region/ }).isDisabled());
      assert(await page.getByRole('button', { name: /Watch Now/ }).isEnabled());
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
