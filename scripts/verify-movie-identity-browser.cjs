const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
      let finishOld;
      let markOld;
      let delayOld = true;
      const oldStarted = new Promise(resolve => { markOld = resolve; });
      await context.route('**/api.themoviedb.org/3/**', async route => {
        const pathname = new URL(route.request().url()).pathname;
        const match = pathname.match(/\/movie\/(\d+)$/);
        if (match) {
          const id = Number(match[1]);
          if (id === 550 && delayOld) {
            delayOld = false;
            markOld();
            await new Promise(resolve => { finishOld = resolve; });
          }
          await route.fulfill({ json: { id: id === 552 ? 999 : id, title: `Movie ${id}`, genres: [], vote_average: 8 } }).catch(() => {});
        } else await route.fulfill({ json: pathname.includes('/genre/') ? { genres: [] } : { results: [] } });
      });
      await context.route('**/localhost:8000/**', route => route.fulfill({ json: { success: true, is_public_domain: false } }));
      for (const host of ['vidlink.pro', 'player.videasy.net', 'vidfast.pro', '111movies.net']) {
        await context.route(`https://${host}/**`, route => route.fulfill({ contentType: 'text/html', body: '<p>Movie ID integration fixture. No provider movie playback claimed.</p>' }));
      }
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const navigate = id => page.evaluate(movieId => {
        history.pushState({}, '', '/moviedetails/' + movieId);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, id);
      await page.goto('http://127.0.0.1:4175/moviedetails/550', { waitUntil: 'domcontentloaded' });
      await oldStarted;
      await navigate(551);
      await page.getByRole('heading', { name: 'Movie 551', exact: true }).waitFor();
      finishOld();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.getByRole('heading', { name: 'Movie 550', exact: true }).count(), 0);
      await page.getByRole('button', { name: /Watch Now/ }).click();
      const selector = page.getByRole('group', { name: 'Streaming server' });
      for (const [server, expected] of [
        ['vidlink', 'https://vidlink.pro/movie/551'],
        ['videasy', 'https://player.videasy.net/movie/551'],
        ['vidfast', 'https://vidfast.pro/movie/551?autoPlay=true&title=false&hideServer=true'],
        ['movies111', 'https://111movies.net/movie/551'],
      ]) {
        await selector.locator(`input[value="${server}"]`).locator("..").click();
        await page.waitForFunction(url => document.querySelector('iframe')?.src === url, expected);
        assert.equal(await page.getByTitle('Movie 551', { exact: true }).getAttribute('src'), expected);
      }
      await navigate(550);
      await page.waitForFunction(() => !document.querySelector('iframe'));
      await page.getByRole('heading', { name: 'Movie 550', exact: true }).waitFor();
      await page.getByRole('button', { name: /Watch Now/ }).click();
      assert.equal(await page.getByTitle('Movie 550', { exact: true }).getAttribute('src'), 'https://vidlink.pro/movie/550');
      await navigate(552);
      await page.getByRole('alert').filter({ hasText: 'does not match the selected movie' }).waitFor();
      assert.equal(await page.getByRole('button', { name: /Watch Now/ }).count(), 0);
      assert.equal(await page.locator('iframe').count(), 0);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, staleMovieResponseIgnored: true, correctIdAcrossFourServers: true, oldPlayerRemovedOnNavigation: true, mismatchedMetadataRejected: true, externalProviderVideoIdentity: 'not verified by this fixture test' }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
