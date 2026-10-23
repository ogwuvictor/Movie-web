// Run against the isolated QA runner. Requires Playwright in your test tools.
const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4174/');
      await page.getByRole('button', { name: 'Load sample', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('video')?.readyState >= 3, null, { timeout: 20000 });
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0.5, null, { timeout: 15000 });
      assert.equal(await page.locator('video').evaluate(v => v.paused), false);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      assert.equal(await page.locator('video').evaluate(v => v.paused), true);
      const time = await page.locator('video').evaluate(v => v.currentTime);
      await page.waitForTimeout(250);
      assert.equal(await page.locator('video').evaluate(v => v.currentTime), time);
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('button', { name: 'Load sample', exact: true }).click();
      await page.waitForFunction(saved => document.querySelector('video')?.currentTime >= saved - 0.1, time);
      await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
      await page.waitForFunction(() => !!document.fullscreenElement);
      await page.evaluate(() => document.exitFullscreen());
      await page.getByRole('button', { name: 'Trigger real media error', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'qa-cc0-b' }).waitFor();
      await page.getByRole('button', { name: 'Load sample', exact: true }).click();
      await page.getByRole('button', { name: 'Switch test source', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'qa-cc0-b' }).waitFor();
      await page.getByRole('button', { name: 'Trigger real media error', exact: true }).click();
      await page.getByRole('alert').waitFor();
      console.log(JSON.stringify({ viewport, playback: 'passed', pause: 'passed', resume: 'passed', fullscreen: 'passed', switching: 'passed', mediaErrorFallback: 'passed', terminalMediaError: 'passed', playedSeconds: time, browser: browser.version() }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
