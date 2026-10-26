// Browser checks use controlled TMDB responses, never provider playback.
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const { chromium } = require(path.join(require('os').tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
const root = path.resolve(__dirname, '../build');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
  fs.createReadStream(file).pipe(res);
});
const seasonList = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, season_number: i + 1, name: `Season ${i + 1}`, episode_count: 14 }));
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const output = path.resolve(__dirname, '../cloudflare/generated');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api.themoviedb.org/**', async route => {
        const url = route.request().url();
        let body = { results: [], genres: [] };
        if (url.includes('/watch/providers')) body = { results: { US: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } } };
        else if (/\/season\/\d+/.test(url)) {
          const season = Number(url.match(/\/season\/(\d+)/)[1]);
          body = { episodes: Array.from({ length: 14 }, (_, i) => ({ id: season * 1000 + i + 1, episode_number: i + 1, name: `Season ${season} episode ${i + 1}`, overview: 'A short description of this episode, with enough text to check how the compact layout wraps on a phone.' })) };
        } else if (url.includes('/movie/550?')) body = { id: 550, title: 'Fixture film', poster_path: '/fixture.jpg', vote_average: 8, runtime: 95, genres: [] };
        else if (url.includes('/tv/1399?')) body = { id: 1399, name: 'Fixture series', poster_path: '/fixture.jpg', vote_average: 8, seasons: seasonList, number_of_seasons: 30, genres: [] };
        await route.fulfill({ json: body });
      });
      await page.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf8sAAAAASUVORK5CYII=', 'base64') }));
      await page.route('**/api/*.php*', route => route.fulfill({ json: { success: true, is_public_domain: false } }));
      for (const host of ['vidlink.pro', 'player.videasy.net']) await page.route(`https://${host}/**`, route => route.fulfill({ contentType: 'text/html', body: '<body style="background:#000;color:#aaa;font-family:sans-serif">Controlled embed fixture</body>' }));
      await page.goto(base + '/about');
      assert.equal(await page.getByText(/Demo Statistics|sample|1M\+|500\+/i).count(), 0);
      const features = await page.locator('.about-features > div').evaluateAll(elements => elements.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
      if (width < 576) {
        assert(features[1].x > features[0].x && Math.abs(features[1].y - features[0].y) < 2);
        assert.equal(await page.locator('.about-content[open]').count(), 0);
        await page.getByText('Our Mission', { exact: true }).click();
        assert.equal(await page.locator('.about-content[open]').count(), 1);
      }
      await page.screenshot({ path: path.join(output, `about-${width}.png`), fullPage: true });
      for (const type of ['movie', 'tv']) {
        await page.goto(base + (type === 'movie' ? '/moviedetails/550' : '/tv/1399'));
        await page.getByRole('button', { name: /Where to Watch/ }).waitFor();
        const actions = await page.locator('.movie-actions > *').evaluateAll(elements => elements.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y, width: el.getBoundingClientRect().width })));
        if (width < 576) {
          assert.equal(actions.length, 3);
          assert(Math.abs(actions[0].y - actions[2].y) < 2 && actions[2].x > actions[1].x);
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: path.join(output, `${type}-actions-${width}.png`) });
        if (type === 'tv') {
          await page.getByRole('combobox', { name: 'Season' }).selectOption('30');
          await page.getByRole('button', { name: /Season 30 episode 1 / }).waitFor();
          assert.equal(await page.locator('.series-episode-button').count(), 6);
          await page.getByRole('button', { name: 'Next', exact: true }).click();
          await page.getByRole('button', { name: /Season 30 episode 7 / }).click();
          assert.equal(await page.getByTitle('Fixture series').getAttribute('src'), 'https://vidlink.pro/tv/1399/30/7');
          await page.getByRole('button', { name: 'Close player' }).click();
          await page.locator('.series-browser').screenshot({ path: path.join(output, `episodes-${width}.png`) });
        }
        await page.getByRole('button', { name: /Watch Now/ }).click();
        await page.getByRole('radio', { name: 'VidLink Pro' }).waitFor({ state: 'attached' });
        await page.getByText('Videasy', { exact: true }).click();
        assert(await page.getByRole('radio', { name: 'Videasy' }).isChecked());
        const frame = page.getByTitle(type === 'movie' ? 'Fixture film' : 'Fixture series');
        assert((await frame.getAttribute('src')).startsWith('https://player.videasy.net/'));
        assert.equal(await frame.getAttribute('sandbox'), null);
        await page.locator('.streaming-modal').screenshot({ path: path.join(output, `player-${type}-${width}.png`) });
        await page.getByRole('button', { name: 'Close player' }).click();
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: About grid/disclosures and factual content, movie/TV action rows, paged episodes and server switching. Embeds are fixtures; provider playback not tested.`);
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
