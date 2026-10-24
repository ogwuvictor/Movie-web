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
const fixture = (id, type) => ({ id, title: `Fixture movie ${id}`, name: `Fixture series ${id}`, media_type: type, poster_path: '/fixture.jpg', vote_average: 8, genres: [], seasons: [] });
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const pages = [];
      await page.route('**/api.themoviedb.org/**', async route => {
        const url = new URL(route.request().url());
        let body = { results: [], genres: [{ id: 28, name: 'Action' }] };
        if (url.pathname.includes('/discover/')) {
          const type = url.pathname.endsWith('/tv') ? 'tv' : 'movie';
          const number = Number(url.searchParams.get('page'));
          pages.push(`${type}:${number}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          body = { total_pages: 3, results: Array.from({ length: 20 }, (_, i) => fixture(550 + (number - 1) * 20 + i, type)) };
        } else if (url.pathname.includes('/search/multi')) body = { total_results: 2, results: [fixture(550, 'movie'), fixture(1399, 'tv')] };
        else if (/\/movie\/\d+$/.test(url.pathname)) body = fixture(Number(url.pathname.split('/').pop()), 'movie');
        else if (/\/tv\/\d+$/.test(url.pathname)) body = fixture(Number(url.pathname.split('/').pop()), 'tv');
        else if (url.pathname.includes('/watch/providers')) body = { results: {} };
        await route.fulfill({ json: body });
      });
      await page.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf8sAAAAASUVORK5CYII=', 'base64') }));
      await page.route('**/api/*.php*', route => route.fulfill({ json: { success: true, is_public_domain: false } }));
      await page.goto(base + '/about');
      const input = page.getByRole('searchbox', { name: 'Search' });
      await input.fill('fixture');
      await page.getByRole('button', { name: 'Search titles' }).click();
      await page.waitForURL('**/search?q=fixture');
      await page.locator('a[href="/moviedetails/550"]').click();
      await page.getByRole('heading', { name: 'Fixture movie 550', exact: true }).waitFor();
      await page.waitForTimeout(700); // Regression: the old debounce redirected after details navigation.
      assert(new URL(page.url()).pathname === '/moviedetails/550');
      await page.goBack();
      await page.getByRole('heading', { name: 'Search Results for "fixture"' }).waitFor();
      await page.reload();
      await page.locator('a[href="/tv/1399"]').click();
      await page.getByRole('heading', { name: 'Fixture series 1399', exact: true }).waitFor();
      await page.waitForTimeout(700);
      assert(new URL(page.url()).pathname === '/tv/1399');
      const field = await page.locator('form.navbar-search').boundingBox();
      const icon = await page.getByRole('button', { name: 'Search titles' }).boundingBox();
      const inputBox = await input.boundingBox();
      assert(icon.x >= inputBox.x && icon.x + icon.width <= inputBox.x + inputBox.width + 1 && field.width <= viewport.width);
      fs.mkdirSync(path.resolve(__dirname, '../cloudflare/generated'), { recursive: true });
      await page.screenshot({ path: path.resolve(__dirname, `../cloudflare/generated/search-field-${viewport.width}.png`) });
      for (const type of ['movie', 'tv']) {
        await page.goto(base + (type === 'tv' ? '/tv/genre/28' : '/genre/28'));
        await page.waitForFunction(() => document.querySelectorAll('.catalog-card').length === 20);
        for (const expected of [40, 60]) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForFunction(count => document.querySelectorAll('.catalog-card').length === count, expected);
        }
        await page.getByText('All available titles loaded.').waitFor();
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(250);
        assert.equal(pages.filter(item => item.startsWith(type + ':')).length, 3);
        assert.equal(await page.locator('.catalog-card').count(), 60);
      }
      assert.deepEqual(errors, []);
      fs.mkdirSync(path.resolve(__dirname, '../cloudflare/generated'), { recursive: true });
      await page.screenshot({ path: path.resolve(__dirname, `../cloudflare/generated/catalog-${viewport.width}.png`) });
      console.log(`PASS ${viewport.width}px: unified search field, movie/TV details navigation, reload/Back query persistence, movie/TV scroll pagination and terminal page.`);
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
