const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of [1440, 768, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500 });
      const items = Array.from({ length: 12 }, (_, i) => ({ id: 100 + i, title: `Movie ${i + 1}`, name: `Show ${i + 1}`, poster_path: i === 1 ? null : i === 2 ? '/broken.svg' : '/poster.svg', release_date: '2026-01-01', overview: 'A test overview.', popularity: 100 - i }));
      await context.route('**/api.themoviedb.org/3/**', route => {
        const url = new URL(route.request().url());
        const json = url.pathname.includes('/genre/') ? { genres: [{ id: 28, name: 'Action' }, { id: 10759, name: 'Action & Adventure' }] }
          : url.pathname.includes('/search/multi') ? { results: [...items.map(item => ({ ...item, media_type: 'movie' })), ...items.slice(0, 3).map(item => ({ ...item, media_type: 'tv' }))] }
          : { results: items };
        return route.fulfill({ json });
      });
      await context.route('https://image.tmdb.org/**', route => route.request().url().includes('broken') ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513"><rect width="342" height="513" fill="#262626"/><text x="25" y="250" fill="white" font-size="25">Poster fixture</text></svg>' }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const [route, prefix] of [['/tv/genre/10759', '/tv/'], ['/genre/28', '/moviedetails/']]) {
        await page.goto('http://127.0.0.1:4175' + route);
        await page.locator('.catalog-card').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('.catalog-card').count(), 12);
        const cards = await page.locator('.catalog-card').evaluateAll(nodes => nodes.slice(0, 3).map(node => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y, width: node.getBoundingClientRect().width })));
        assert(cards[0].width < 220, JSON.stringify(cards));
        assert.equal(cards[0].y, cards[1].y);
        if (width < 500) assert(cards[2].y > cards[0].y);
        else assert.equal(cards[1].y, cards[2].y);
        assert.equal(await page.locator('.catalog-card').first().getAttribute('href'), prefix + '100');
        await page.waitForFunction(() => document.querySelectorAll('.catalog-card img')[1].hidden);
        assert.equal(await page.locator('.catalog-poster-fallback').nth(1).innerText(), 'No poster available');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
        await page.screenshot({ path: path.join(os.tmpdir(), `cinehub-${prefix === '/tv/' ? 'tv' : 'movies'}-grid-${width}.png`), fullPage: true });
        await page.locator('.catalog-card').first().click();
        await page.waitForURL('**' + prefix + '100');
      }
      await page.goto('http://127.0.0.1:4175/');
      // The mobile navbar's search field can be offscreen until the menu is opened.
      const input = page.getByRole('searchbox', { name: 'Search', exact: true });
      if (!await input.isVisible()) await page.locator('.navbar-toggler').click();
      await input.fill('movie');
      await page.waitForURL('**/search');
      await page.locator('.search-content .movie-row-card').first().waitFor();
      await page.mouse.move(0, 0);
      const layout = await page.locator('.search-content').evaluate(el => ({ width: el.getBoundingClientRect().width, gutter: parseFloat(getComputedStyle(el).paddingLeft), viewport: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
      assert(layout.gutter <= 36 && layout.gutter >= 16, JSON.stringify(layout));
      assert(layout.width >= layout.viewport - 1);
      assert.equal(layout.overflow, false);
      const poster = await page.locator('.search-content .movie-row-poster').first().evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }));
      assert(poster.width <= 160 && poster.height <= 240, JSON.stringify(poster));
      assert.equal(await page.getByRole('button', { name: 'Watch Trailers', exact: true }).count(), 0);
      assert.equal(await page.locator('.search-content .movie-row-card').first().getAttribute('href'), '/moviedetails/100');
      assert.equal(await page.locator('.search-content .movie-row-overlay').first().evaluate(el => getComputedStyle(el).opacity), '1');
      assert.equal(await page.locator('.search-content .movie-row-card').nth(1).locator('img').isVisible(), false);
      await page.waitForFunction(() => document.querySelectorAll('.search-content .movie-row-card img')[2].hidden);
      assert.equal(await page.locator('.search-content .movie-row-card').nth(2).locator('img').isVisible(), false);
      await page.screenshot({ path: path.join(os.tmpdir(), `cinehub-search-${width}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, compactGenreGrids: 'passed', missingAndBrokenPosters: 'passed', cardNavigation: 'passed', searchLayout: layout, searchPoster: poster }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
