const path = require('path');
const os = require('os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
// Big Buck Bunny (TMDB 10378) is CC BY 3.0, Blender Foundation.
// Diagnose normal embeds only; no browser/website security controls are disabled.
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const [id, url] of [
      ['vidlink', 'https://vidlink.pro/movie/10378'],
      ['videasy', 'https://player.videasy.net/movie/10378'],
      ['vidfast', 'https://vidfast.pro/movie/10378?autoPlay=true&title=false&hideServer=true'],
      ['movies111', 'https://111movies.net/movie/10378'],
    ]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: false });
      const page = await context.newPage();
      const failures = [];
      const consoleErrors = [];
      page.on('popup', popup => popup.close());
      page.on('requestfailed', request => {
        try { failures.push({ host: new URL(request.url()).hostname, error: request.failure()?.errorText }); } catch {}
      });
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300)); });
      await page.goto('http://127.0.0.1:4175/', { waitUntil: 'domcontentloaded' });
      const sandbox = process.argv.includes('--sandbox') ? ' sandbox="allow-scripts allow-same-origin allow-presentation"' : '';
      await page.setContent('<h1>Big Buck Bunny embed check</h1><p>2008 Blender Foundation, CC BY 3.0. <a href="https://peach.blender.org/about/">License</a></p><iframe title="Provider diagnostic" width="1000" height="563"' + sandbox + ' allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>');
      await page.locator('iframe').evaluate((frame, src) => { frame.src = src; }, url);
      await page.waitForTimeout(8000);
      const frames = [];
      for (const frame of page.frames().filter(frame => frame !== page.mainFrame())) {
        let host = '';
        try { host = new URL(frame.url()).hostname; } catch {}
        try {
          const body = (await frame.locator('body').innerText({ timeout: 1000 })).slice(0, 600);
          const videos = await frame.locator('video').evaluateAll(videos => videos.map(video => ({ readyState: video.readyState, currentTime: video.currentTime, paused: video.paused, width: video.videoWidth, error: video.error?.message || null })));
          frames.push({ host, body, videos });
        } catch { frames.push({ host, inaccessible: true }); }
      }
      await page.screenshot({ path: path.join(os.tmpdir(), `moviesync-diagnostic-${id}.png`) });
      console.log(JSON.stringify({ provider: id, openMovieTmdbId: 10378, frames, failedRequests: failures.slice(0, 8), consoleErrors: consoleErrors.slice(0, 3) }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
