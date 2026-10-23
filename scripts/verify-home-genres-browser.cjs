const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
const names = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction', 'TV Movie', 'Thriller', 'War', 'Western'];
const ids = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const mobile = viewport.width < 500;
      const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
      await context.route('**/api.themoviedb.org/3/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.includes('/genre/')
        ? { genres: names.map((name, i) => ({ id: ids[i], name })) }
        : { results: Array.from({ length: 12 }, (_, i) => ({ id: 550 + i, title: `Fixture movie ${i + 1}`, name: `Fixture show ${i + 1}`, overview: 'Movie metadata fixture.', poster_path: '/fixture.svg', vote_average: 8 })) } }));
      await context.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><rect width="500" height="750" fill="#262626"/><text x="50" y="375" fill="white" font-size="40">Movie poster</text></svg>' }));
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4175/');
      const nav = page.getByRole('navigation', { name: 'Movie genres' });
      await nav.waitFor();
      await page.evaluate(() => document.fonts.ready);
      const chips = nav.locator('.genre-chips');
      await chips.scrollIntoViewIfNeeded();
      assert.equal(await nav.getByRole('link').count(), 19);
      assert.equal(await nav.locator('select,.dropdown-toggle').count(), 0);
      assert.equal(await page.locator('.navbar .genre-dropdown-portal').count(), 1);
      const layout = await page.locator('.home-content').evaluate(el => ({ width: el.getBoundingClientRect().width, left: parseFloat(getComputedStyle(el).paddingLeft), right: parseFloat(getComputedStyle(el).paddingRight), page: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.equal(layout.left, layout.right);
      assert(layout.left <= 48 && layout.width >= layout.page - 1);
      assert(layout.scroll <= layout.page + 1);
      assert(await chips.evaluate(el => el.scrollWidth > el.clientWidth));
      const box = await chips.boundingBox();
      const x = box.x + box.width * 0.75;
      const y = box.y + 20;
      if (mobile) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 10; i++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 20, y }] });
          await page.waitForTimeout(20);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - 250, y, { steps: 12 });
        await page.mouse.up();
      }
      await page.waitForFunction(() => document.querySelector('.genre-chips').scrollLeft > 40);
      assert.equal(new URL(page.url()).pathname, '/');
      await page.screenshot({ path: path.join(os.tmpdir(), `movie-home-genres-${viewport.width}.png`) });
      await nav.getByRole('link', { name: 'Action', exact: true }).click();
      await page.getByRole('heading', { name: 'Action Movies', exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/genre/28');
      console.log(JSON.stringify({ viewport, sideGutters: layout.left, horizontalPageOverflow: false, genreButtons: 19, interaction: mobile ? 'native touch swipe passed' : 'mouse drag passed', genreNavigation: 'passed', navbarDropdownPreserved: true }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
