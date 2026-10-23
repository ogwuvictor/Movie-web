const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require(path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
const baseline = process.argv.includes('--baseline');
const baselinePath = path.join(os.tmpdir(), 'cinehub-mobile-baseline.json');
const snapshots = baseline ? {} : JSON.parse(fs.readFileSync(baselinePath));
const items = Array.from({ length: 12 }, (_, i) => ({ id: 550 + i, title: `Movie ${i + 1}`, name: `Series ${i + 1}`, poster_path: '/poster.svg', overview: 'Discover a story of adventure, friendship, and unexpected discoveries.', release_date: '2026-01-01', vote_average: 8, popularity: 100 - i }));
const genres = Array.from({ length: 19 }, (_, i) => ({ id: i === 0 ? 28 : 100 + i, name: ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction', 'TV Movie', 'Thriller', 'War', 'Western'][i] }));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of process.env.QA_WIDTH ? [Number(process.env.QA_WIDTH)] : process.env.PHONE_QA_ONLY ? [320, 390, 430] : baseline ? [1440, 768, 390] : [1440, 768, 320, 390, 430]) {
      const mobile = width < 576;
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: mobile, hasTouch: mobile });
      await context.route('**/api.themoviedb.org/3/**', route => {
        const url = new URL(route.request().url());
        let data = { results: items };
        if (url.pathname.includes('/genre/')) data = { genres };
        else if (url.pathname.endsWith('/watch/providers')) data = { results: { US: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } } };
        else if (url.pathname.endsWith('/season/1')) data = { episodes: [{ id: 999, season_number: 1, episode_number: 1, name: 'The first adventure', overview: items[0].overview }] };
        else if (/\/(movie|tv)\/550$/.test(url.pathname)) data = { ...items[0], runtime: 120, genres: [{ id: 28, name: 'Action' }], seasons: [{ id: 1, name: 'Season 1', season_number: 1, episode_count: 1 }], number_of_seasons: 1 };
        else if (url.pathname.endsWith('/search/multi')) data = { results: items.map(item => ({ ...item, media_type: 'movie' })) };
        return route.fulfill({ json: data });
      });
      await context.route('**/localhost:8000/**', route => route.fulfill({ json: { success: true, is_public_domain: false } }));
      await context.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513"><rect width="342" height="513" fill="#263747"/><circle cx="171" cy="190" r="95" fill="#4c6b75"/><text x="48" y="380" font-family="sans-serif" font-size="32" fill="white">Movie poster</text></svg>' }));
      await context.route('https://vidlink.pro/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Player layout fixture; no playback claimed.</p>' }));
      await context.route('**/streaming-availability.json', route => route.fulfill({ json: { movies: { 550: { available: true, serverIds: ['vidlink', 'videasy', 'vidfast', 'movies111'], checkedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 600000).toISOString() } } } }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of ['/', '/about', '/genre/28', '/moviedetails/550', '/tv/550', '/search']) {
        await page.goto('http://127.0.0.1:4175' + (route === '/search' ? '/' : route));
        if (route === '/search') {
          const search = page.getByRole('searchbox', { name: 'Search', exact: true });
          if (!await search.isVisible()) await page.getByRole('button', { name: 'Toggle navigation' }).click();
          await search.fill('movie');
          await page.waitForURL('**/search');
        }
        await page.locator(route === '/about' ? '.feature-card' : route === '/genre/28' ? '.catalog-card' : route.includes('/550') ? '.movie-title' : '.movie-row-card').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const metrics = await page.evaluate(() => {
          const selectors = ['.navbar', '.hero-section', '.hero-title', '.home-content', '.search-content', '.catalog-card', '.movie-poster', '.movie-info', '.movie-row-card', '.about-content'];
          return Object.fromEntries(selectors.map(selector => {
            const el = document.querySelector(selector);
            if (!el) return [selector, null];
            const r = el.getBoundingClientRect(), s = getComputedStyle(el);
            return [selector, { x: r.x, y: r.y, width: r.width, height: r.height, fontSize: s.fontSize, padding: s.padding, display: s.display }];
          }));
        });
        const key = width + route;
        if (baseline) snapshots[key] = metrics;
        else if (!mobile) assert.deepEqual(metrics, snapshots[key], `Desktop/tablet layout changed: ${key}`);
        if (!baseline && mobile) {
          assert(await page.getByRole('searchbox', { name: 'Search', exact: true }).isVisible(), 'Search must be accessible without opening the menu');
          const searchBox = await page.getByRole('searchbox', { name: 'Search', exact: true }).boundingBox();
          assert(searchBox.height >= 44);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, route);
          if (route.includes('/550')) {
            const poster = await page.locator('.movie-poster').boundingBox();
            const title = await page.locator('.movie-title').boundingBox();
            assert(title.y > poster.y + poster.height, 'Detail title must follow the centered poster');
            await page.screenshot({ path: path.join(os.tmpdir(), `cinehub-detail-check-${width}.png`), fullPage: true });
            assert(Math.abs(poster.x + poster.width / 2 - width / 2) < 2, JSON.stringify({ width, poster, metrics }));
            await page.getByRole('button', { name: /Watch Now/ }).click();
            const modal = page.getByRole('dialog');
            await modal.getByRole('combobox', { name: 'Streaming server' }).waitFor();
            const box = await modal.locator('.modal-content').boundingBox();
            assert(box.width <= width - 12 && box.height <= 844 - 12);
            assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
            await page.getByRole('button', { name: 'Close player' }).click();
            assert.equal(await page.evaluate(() => document.body.style.overflow), '');
          }
          if (route === '/') {
            const row = page.locator('.movie-row').first();
            await row.scrollIntoViewIfNeeded();
            const cdp = await context.newCDPSession(page), box = await row.boundingBox();
            const x = box.x + box.width * .8, y = box.y + 60;
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
            for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 22, y }] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await page.waitForFunction(() => document.querySelector('.movie-row').scrollLeft > 20);
            const stationaryRow = page.locator('.movie-row').nth(1);
            const before = await stationaryRow.evaluate(el => el.scrollLeft);
            await page.waitForTimeout(4300);
            assert.equal(await stationaryRow.evaluate(el => el.scrollLeft), before, 'Phone rows should not advance automatically');
          }
        }
        if (mobile) await page.screenshot({ path: path.join(os.tmpdir(), `cinehub-mobile-${baseline ? 'before' : 'after'}-${width}-${route.replaceAll('/', '-') || 'home'}.png`), fullPage: route !== '/' });
      }
      if (!baseline && mobile) {
        await page.goto('http://127.0.0.1:4175/');
        await page.locator('.genre-chip').first().waitFor();
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        const drawer = page.getByRole('dialog', { name: 'Navigation', exact: true });
        await drawer.waitFor();
        await page.waitForTimeout(250);
        const panel = await drawer.boundingBox();
        assert.equal(panel.x, 0);
        assert(panel.width < width && panel.height === 844);
        assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
        assert.equal(await page.evaluate(() => document.getElementById('root').inert), true);
        const close = page.getByRole('button', { name: 'Close navigation' });
        await close.focus();
        await page.keyboard.press('Shift+Tab');
        assert(await drawer.evaluate(el => el.contains(document.activeElement)));
        await page.keyboard.press('Tab');
        assert(await close.evaluate(el => el === document.activeElement));
        await page.screenshot({ path: path.join(os.tmpdir(), `cinehub-mobile-drawer-${width}.png`) });
        await page.keyboard.press('Escape');
        assert.equal(await drawer.count(), 0);
        assert.equal(await page.evaluate(() => document.getElementById('root').inert), false);
        assert(await page.getByRole('button', { name: 'Toggle navigation' }).evaluate(el => el === document.activeElement));
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        await drawer.waitFor();
        await page.mouse.click(width - 4, 400);
        assert.equal(await drawer.count(), 0);
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        await drawer.getByRole('link', { name: 'About', exact: true }).click();
        await page.waitForURL('**/about');
        assert.equal(await drawer.count(), 0);
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        await page.locator('.genre-dropdown-portal > a').click();
        const menu = await page.locator('.genre-portal-menu').boundingBox();
        assert(menu.x >= 0 && menu.x + menu.width <= width);
        await page.locator('.genre-portal-menu a').filter({ hasText: /^Action$/ }).click();
        await page.waitForURL('**/genre/28');
        assert.equal(await page.getByRole('button', { name: 'Toggle navigation' }).getAttribute('aria-expanded'), 'false');
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        await page.locator('.genre-dropdown-portal > a').click();
        await page.locator('.genre-portal-menu a').filter({ hasText: /^Action$/ }).click();
        assert.equal(await drawer.count(), 0, 'Selecting the current genre should also close the drawer');
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        await page.locator('.tv-genre-dropdown > a').click();
        await page.locator('.tv-genre-portal-menu a').filter({ hasText: /^Action$/ }).click();
        await page.waitForURL('**/tv/genre/28');
        assert.equal(await drawer.count(), 0);
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        await page.getByRole('button', { name: 'Close navigation' }).click();
        assert.equal(await drawer.count(), 0);
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        await page.setViewportSize({ width: 768, height: 844 });
        await page.waitForFunction(() => !document.querySelector('.mobile-nav-overlay'));
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');
        assert.equal(await page.evaluate(() => document.getElementById('root').inert), false);
      }
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, result: baseline ? 'baseline saved' : mobile ? 'mobile layouts, search, touch, navigation and player sizing passed' : 'desktop/tablet layout unchanged' }));
      await context.close();
    }
    if (baseline) fs.writeFileSync(baselinePath, JSON.stringify(snapshots));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
