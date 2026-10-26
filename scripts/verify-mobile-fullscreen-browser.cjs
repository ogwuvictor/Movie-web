const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
const clip = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
// Each provider URL is replaced with a controlled embed containing an actual
// CC0 video. This verifies app sizing and cross-origin fullscreen delegation,
// not the providers' movie availability or their private player interfaces.
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.route('**/api.themoviedb.org/3/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      return route.fulfill({ json: /\/movie\/550$/.test(pathname) ? { id: 550, title: 'Fullscreen QA fixture', runtime: 120, genres: [], release_date: '2000-01-01', status: 'Released' } : pathname.includes('/genre/') ? { genres: [] } : { results: [] } });
    });
    await context.route('**/localhost:8000/**', route => route.fulfill({ json: { success: true, is_public_domain: false } }));
    for (const host of ['vidlink.pro', 'player.videasy.net', 'vidfast.pro', '111movies.net']) {
      await context.route(`https://${host}/**`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;object-fit:contain}button{position:absolute;top:8px;left:8px;z-index:2;min-height:44px}</style></head><body><video src="${clip}" controls playsinline loop preload="auto"></video><button onclick="document.querySelector('video').play();document.documentElement.requestFullscreen()">Expand fullscreen</button></body></html>` }));
    }
    await context.route('**/streaming-availability.json', route => route.fulfill({ json: { movies: { 550: { available: true, serverIds: ['vidlink', 'videasy', 'vidfast', 'movies111'], checkedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 600000).toISOString() } } } }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4175/moviedetails/550');
    await page.getByRole('button', { name: /Watch Now/ }).click();
    for (const provider of ['vidlink', 'videasy', 'vidfast', 'movies111']) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator(`.streaming-server-option input[value="${provider}"]`).locator("..").click();
      const iframe = page.locator('.streaming-viewport iframe');
      const frame = page.frameLocator('.streaming-viewport iframe');
      await frame.locator('video').waitFor();
      await frame.locator('video').evaluate(video => new Promise((resolve, reject) => {
        if (video.readyState >= 3) return resolve();
        video.addEventListener('canplay', resolve, { once: true });
        video.addEventListener('error', () => reject(new Error('CC0 media failed to load')), { once: true });
      }));
      await frame.getByRole('button', { name: 'Expand fullscreen' }).click();
      await page.waitForFunction(() => document.fullscreenElement?.tagName === 'IFRAME');
      await frame.locator('video').evaluate(video => new Promise(resolve => {
        if (video.currentTime > .2 && !video.paused) return resolve();
        const observe = () => { if (video.currentTime > .2 && !video.paused) { video.removeEventListener('timeupdate', observe); resolve(); } };
        video.addEventListener('timeupdate', observe);
      }));
      for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        await page.waitForFunction(({ width, height }) => {
          const box = document.querySelector('.streaming-viewport iframe').getBoundingClientRect();
          return Math.abs(box.width - width) < 2 && Math.abs(box.height - height) < 2;
        }, viewport);
        const box = await iframe.boundingBox();
        assert(Math.abs(box.x) < 2 && Math.abs(box.y) < 2);
        assert.equal(await frame.locator('video').evaluate(video => getComputedStyle(video).objectFit), 'contain');
        if (provider === 'vidlink') await page.screenshot({ path: path.join(os.tmpdir(), `cinehub-fullscreen-${viewport.width}.png`) });
      }
      await page.evaluate(() => document.exitFullscreen());
      await page.waitForFunction(() => !document.fullscreenElement);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden', 'Rotation must retain the page scroll lock');
      const inlineBox = await iframe.boundingBox();
      assert(inlineBox.x >= 0 && inlineBox.x + inlineBox.width <= 844);
      assert(inlineBox.y >= 0 && inlineBox.y + inlineBox.height <= 390, JSON.stringify(inlineBox));
      const identity = await iframe.getAttribute('src');
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await iframe.getAttribute('src'), identity, 'Rotation must not reload the source');
      console.log(JSON.stringify({ provider, actualCC0Playback: true, portraitFullscreen: 'passed', landscapeFullscreen: 'passed', inlineLandscapeFits: true, providerEmbed: 'controlled fixture, not a live provider playback test' }));
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page.screenshot({ path: path.join(os.tmpdir(), 'cinehub-landscape-player.png') });
    await page.getByRole('button', { name: 'Close player' }).click();
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
