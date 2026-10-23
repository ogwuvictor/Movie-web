const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 500, hasTouch: width < 500 });
      await context.route('**/api.themoviedb.org/3/**', route => route.fulfill({ json: /\/movie\/550\?/.test(route.request().url()) ? { id: 550, title: 'Sandbox QA', genres: [], runtime: 120 } : { results: [], genres: [] } }));
      await context.route('**/api/check.php?*', route => route.fulfill({ json: { success: true, is_public_domain: false } }));
      const frameHtml = '<!doctype html><button id="attack">Try navigation</button><script>document.querySelector("button").onclick=()=>{window.popupBlocked=window.open("https://example.invalid/popup")===null;try{top.location.href="https://example.invalid/redirect"}catch(e){window.navigationBlocked=true}}</script>';
      for (const host of ['vidlink.pro', 'player.videasy.net', 'vidfast.pro', '111movies.net']) await context.route(`https://${host}/**`, route => route.fulfill({ contentType: 'text/html', body: frameHtml }));
      const page = await context.newPage();
      const response = await page.goto('http://127.0.0.1:4175/moviedetails/550');
      assert(response.headers()['content-security-policy'].includes("object-src 'none'"));
      await page.getByRole('button', { name: /Watch Now/ }).click();
      for (const server of ['vidlink', 'videasy', 'vidfast', 'movies111']) {
        await page.getByLabel('Streaming server', { exact: true }).selectOption(server);
        const frame = page.frameLocator('iframe');
        await frame.locator('#attack').click();
        const child = page.frames().find(f => f !== page.mainFrame());
        assert(await child.evaluate(() => window.popupBlocked && window.navigationBlocked));
        assert.equal(context.pages().length, 1);
        assert.equal(page.url(), 'http://127.0.0.1:4175/moviedetails/550');
      }
      console.log(JSON.stringify({ width, providers: 4, popupBlocked: true, topNavigationBlocked: true, providerContent: 'controlled security fixture; not provider playback' }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
