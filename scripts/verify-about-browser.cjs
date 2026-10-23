const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1000 }, { width: 320, height: 844 }, { width: 390, height: 844 }, { width: 430, height: 844 }]) {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
      await context.route('**/api.themoviedb.org/3/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.includes('/genre/')
        ? { genres: [{ id: 28, name: 'Action' }, { id: 10759, name: 'Action & Adventure' }] }
        : { results: [] } }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4175/about');
      await page.getByRole('heading', { name: 'About CineHub', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('.feature-card').count(), 3);
      assert.equal(await page.locator('.stat-number').count(), 6);
      assert.equal(await page.getByRole('button', { name: /Learn More|Start Exploring/ }).count(), 0);
      const text = await page.locator('body').innerText();
      for (const placeholder of ['10K+', '50K+', 'Personalized recommendations']) assert(!text.includes(placeholder));
      assert(text.includes('Demo Statistics') && text.includes('Illustrative sample figures only.') && text.includes('no users yet'));
      assert(text.includes('Where to Watch') && text.includes('Watch Now'));
      await page.getByRole('link', { name: 'How It Works', exact: true }).click();
      assert.equal(new URL(page.url()).hash, '#how-it-works');
      assert(await page.locator('#how-it-works').isVisible());
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false);
      if (viewport.width < 500) {
        assert.equal(await page.locator('.feature-card .text-secondary').first().evaluate(el => getComputedStyle(el).color), 'rgb(179, 179, 179)');
        const heroButtons = await page.locator('.about-page .hero-section .btn').evaluateAll(nodes => nodes.map(node => {
          const rect = node.getBoundingClientRect();
          return { y: rect.y, height: rect.height, width: rect.width };
        }));
        assert.equal(heroButtons[0].y, heroButtons[1].y);
        assert(heroButtons.every(button => button.height >= 44));
        const cards = await page.locator('.about-features .feature-card').evaluateAll(nodes => nodes.map(node => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y, width: node.getBoundingClientRect().width })));
        assert(cards[0].width >= viewport.width * 0.8);
        assert.equal(cards[0].x, cards[1].x);
        assert(cards[1].y > cards[0].y);
        const iconAndCopy = await page.locator('.feature-card').first().evaluate(el => ({
          icon: el.querySelector('.feature-icon').getBoundingClientRect().x,
          title: el.querySelector('.feature-title').getBoundingClientRect().x,
          paragraph: el.querySelector('p').getBoundingClientRect().x,
        }));
        assert(iconAndCopy.icon < iconAndCopy.title);
        assert.equal(iconAndCopy.title, iconAndCopy.paragraph);
        const steps = await page.locator('.about-steps .stat-item').evaluateAll(nodes => nodes.map(node => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y })));
        assert.equal(steps[0].x, steps[2].x);
        assert(steps[2].y > steps[0].y);
        const stats = await page.locator('.about-demo-stats .stat-item').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().y));
        assert.equal(stats[0], stats[1]);
        assert.equal(await page.locator('.about-intro').evaluate(el => getComputedStyle(el).textAlign), 'left');
      }
      await page.screenshot({ path: path.join(os.tmpdir(), `cinehub-about-${viewport.width}.png`), fullPage: true });
      await page.locator('.cta-section').getByRole('link', { name: /Browse Movies/ }).click();
      await page.getByRole('heading', { name: 'Browse by Genre', exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(await page.getByRole('button', { name: 'Watch Trailers', exact: true }).count(), 0);
      await page.goto('http://127.0.0.1:4175/about');
      await page.getByRole('link', { name: /Explore TV Shows/ }).click();
      await page.waitForURL('**/tv/genre/10759');
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ viewport, aboutContent: 'passed', demoStatisticsClearlyLabeled: true, howItWorksAnchor: 'passed', movieAndTvLinks: 'passed', horizontalOverflow: false, sharedHomeHeroPreserved: true }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
