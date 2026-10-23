const path = require('path');
const os = require('os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const url of ['https://vidfast.vc/', 'https://docs.videasy.net/', 'https://videasy.net/']) {
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(2000);
        const text = await page.locator('body').innerText({ timeout: 3000 });
        const lines = text.split('\n');
        const relevant = lines.flatMap((line, i) => /subtitle|language|documentation|sub=|subLang|ds_lang/i.test(line) ? lines.slice(Math.max(0, i - 1), i + 5) : []).slice(0, 160);
        console.log(JSON.stringify({ requested: url, final: page.url(), relevant, links: await page.locator('a').evaluateAll(links => links.map(link => ({ text: link.textContent, href: link.href })).filter(link => /doc|subtitle|language/i.test(link.text + link.href)).slice(0, 15)) }));
      } catch (error) { console.log(JSON.stringify({ url, error: error.message.split('\n')[0] })); }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
