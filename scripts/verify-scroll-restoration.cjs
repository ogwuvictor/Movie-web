// Real Chrome navigation against the production build; metadata is a fixture.
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
const movies = Array.from({ length: 20 }, (_, i) => ({ id: 550 + i, title: `Fixture movie ${i}`, name: `Fixture series ${i}`, poster_path: '/fixture.jpg', vote_average: 8, media_type: 'movie' }));
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.route('**/api.themoviedb.org/**', async route => {
        const url = route.request().url();
        let body = { results: movies, genres: [] };
        if (/\/movie\/\d+\?/.test(url)) body = { ...movies[0], id: Number(url.match(/\/movie\/(\d+)/)[1]), genres: [] };
        else if (/\/tv\/\d+\?/.test(url)) body = { ...movies[0], id: Number(url.match(/\/tv\/(\d+)/)[1]), genres: [], seasons: [] };
        else if (url.includes('/watch/providers')) body = { results: {} };
        else await new Promise(resolve => setTimeout(resolve, 150));
        await route.fulfill({ json: body });
      });
      await page.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf8sAAAAASUVORK5CYII=', 'base64') }));
      await page.route('**/api/*.php*', route => route.fulfill({ json: { success: true, is_public_domain: false, available: false } }));
      for (const kind of ['movie', 'tv']) {
        await page.goto(base);
        const row = kind === 'tv' ? page.locator('.movie-row').filter({ has: page.locator('a[href^="/tv/"]') }).first() : page.locator('.movie-row').nth(3);
        await row.locator('a').first().waitFor();
        await row.scrollIntoViewIfNeeded();
        await row.evaluate(el => el.scrollTo({ left: 500, behavior: 'instant' }));
        const saved = await row.evaluate(el => ({ y: window.scrollY, left: el.scrollLeft, index: Array.from(document.querySelectorAll('.movie-row')).indexOf(el) }));
        await row.locator('a').first().evaluate(el => el.click());
        await page.waitForURL(kind === 'tv' ? '**/tv/*' : '**/moviedetails/*');
        await page.getByRole('link', { name: /Back to Home/ }).last().click();
        await page.waitForURL(base + '/');
        await page.waitForFunction(({ y, left, index }) => Math.abs(window.scrollY - y) < 3 && Math.abs(document.querySelectorAll('.movie-row')[index]?.scrollLeft - left) < 3, saved);
        // Browser Back must also restore the saved Home position.
        await row.locator('a').first().evaluate(el => el.click());
        await page.waitForURL(kind === 'tv' ? '**/tv/*' : '**/moviedetails/*');
        await page.goBack();
        await page.waitForFunction(({ y, left, index }) => Math.abs(window.scrollY - y) < 3 && Math.abs(document.querySelectorAll('.movie-row')[index]?.scrollLeft - left) < 3, saved);
        assert(saved.y > 0 && saved.left > 0);
      }
      console.log(`PASS ${viewport.width}px: movie/series Home links and browser Back restore vertical and row positions after async loading.`);
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
