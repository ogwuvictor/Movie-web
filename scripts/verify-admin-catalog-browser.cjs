const path = require('path');
const os = require('os');
const fs = require('fs');
const assert = require('assert/strict');
const { chromium } = require(path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
const base = 'http://127.0.0.1:8000';
if (!process.env.CINEHUB_ADMIN_USER?.startsWith('catalog_qa_') || !process.env.CINEHUB_ADMIN_PASSWORD) throw Error('Use verify-admin-catalog.php to create a disposable QA admin.');
const id = '9007199254740000'; // Synthetic QA record, never a real TMDB title.
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let context;
  let token;
  let created = false;
  const catalogPath = path.join(__dirname, '../public/streaming-availability.json');
  const initial = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  assert(!initial.movies[id], 'Synthetic QA ID already exists; refusing to overwrite it');
  try {
    context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const anonymous = await browser.newContext();
    assert.equal((await anonymous.request.post(base + '/api/streaming-availability.php', { data: {} })).status(), 401);
    await anonymous.close();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/admin/');
    await page.getByLabel('Username', { exact: true }).fill(process.env.CINEHUB_ADMIN_USER);
    await page.getByLabel('Password', { exact: true }).fill(process.env.CINEHUB_ADMIN_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL('**/admin/index.php');
    await page.getByRole('link', { name: 'Streaming Availability', exact: true }).click();
    await page.getByRole('heading', { name: 'Streaming Availability', exact: true }).waitFor();
    token = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const mutation = (method, data, csrf = token) => context.request.fetch(base + '/api/streaming-availability.php', { method, headers: { 'X-CSRF-Token': csrf }, data });
    const record = { tmdbId: id, title: 'Temporary QA catalog record', available: false, serverIds: ['vidlink'], validMinutes: 15, confirmed: false };
    assert.equal((await mutation('POST', record, 'invalid')).status(), 403);
    assert.equal((await mutation('POST', { ...record, available: true })).status(), 422);
    assert.equal((await mutation('POST', { ...record, serverIds: ['unknown'] })).status(), 422);
    assert.equal((await mutation('POST', { ...record, validMinutes: 1441 })).status(), 422);
    await page.getByLabel('TMDB movie ID', { exact: true }).fill(id);
    await page.getByLabel('Movie title', { exact: true }).fill(record.title);
    await page.getByLabel('Availability', { exact: true }).selectOption('false');
    await page.getByLabel('VidLink Pro', { exact: true }).check();
    await page.getByRole('button', { name: 'Save availability', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Availability record saved.' }).waitFor();
    created = true;
    await page.getByRole('button', { name: 'Edit ' + record.title, exact: true }).waitFor();
    const publicData = await (await context.request.get(base + '/api/streaming-availability.php')).json();
    assert.equal(publicData.movies[id].available, false);
    assert.deepEqual(publicData.movies[id].serverIds, ['vidlink']);
    assert.equal(JSON.parse(fs.readFileSync(catalogPath, 'utf8')).movies[id].title, record.title);
    await page.getByRole('button', { name: 'Edit ' + record.title, exact: true }).click();
    assert.equal(await page.getByLabel('I have confirmed', { exact: false }).isChecked(), false);
    await page.getByLabel('Movie title', { exact: true }).fill(record.title + ' edited');
    await page.getByLabel('Videasy', { exact: true }).check();
    await page.getByRole('button', { name: 'Save availability', exact: true }).click();
    await page.getByRole('button', { name: 'Edit ' + record.title + ' edited', exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await page.screenshot({ path: path.join(os.tmpdir(), 'cinehub-admin-streaming.png'), fullPage: true });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Remove ' + record.title + ' edited', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Availability record removed.' }).waitFor();
    created = false;
    assert.deepEqual(JSON.parse(fs.readFileSync(catalogPath, 'utf8')), initial);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ adminLogin: 'passed', catalogCreateEditDelete: 'passed', publicApiAndFileMatch: true, unauthorizedWrite: 401, csrfRejection: 403, invalidRecordsRejected: true, mobileOverflow: false, qaRecordRemoved: true }));
  } finally {
    if (token && context) {
      const current = await (await context.request.get(base + '/api/streaming-availability.php')).json();
      if (current.movies?.[id]?.title?.startsWith('Temporary QA catalog record')) await context.request.delete(base + '/api/streaming-availability.php', { headers: { 'X-CSRF-Token': token }, data: { tmdbId: id } });
    }
    if (context) await context.request.post(base + '/admin/logout.php', { form: { csrf_token: token } });
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
