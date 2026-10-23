// Uses only the disposable admin created by verify-admin-catalog.php.
const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const { chromium } = require(path.join(os.tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
const base = 'http://127.0.0.1:8000';
const username = process.env.CINEHUB_ADMIN_USER;
const password = process.env.CINEHUB_ADMIN_PASSWORD;
if (!username?.startsWith('catalog_qa_') || !password) throw Error('Disposable QA account required.');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  let movieId;
  let context;
  let csrf;
  try {
    const anonymous = await browser.newContext();
    for (const [method, url] of [
      ['POST', '/api/movies.php'], ['PUT', '/api/movies.php?id=1'], ['DELETE', '/api/movies.php?id=1'],
      ['GET', '/api/analytics.php?dashboard=true'], ['GET', '/api/performance.php?type=dashboard'],
      ['PUT', '/api/performance.php?type=feature_flags'], ['POST', '/api/performance.php?type=system_metric'],
      ['POST', '/admin/change_password.php']
    ]) assert.equal((await anonymous.request.fetch(base + url, { method, ...(method !== 'GET' ? { data: {} } : {}) })).status(), 401, url);
    for (const file of ['/config.php', '/security.php', '/database.sql', '/README.md', '/lib/streaming_availability.php', '/data/streaming-catalog.lock', '/test_login.php', '/.env']) {
      assert.equal((await anonymous.request.get(base + file)).status(), 404, file);
    }
    assert.equal((await anonymous.request.get(base + '/api/check.php?tmdb_id=550', { headers: { Origin: 'https://evil.example' } })).status(), 403);
    const cors = await anonymous.request.get(base + '/api/check.php?tmdb_id=550', { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(cors.headers()['access-control-allow-origin'], 'http://localhost:3000');
    assert.equal((await anonymous.request.post(base + '/admin/login.php', { form: { username, password } })).status(), 403);
    assert.equal((await anonymous.request.get(base + '/admin/logout.php')).status(), 405);

    context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const login = async (target, accountPassword = password) => {
      await target.goto(base + '/admin/login.php');
      await target.getByLabel('Username', { exact: true }).fill(username);
      await target.getByLabel('Password', { exact: true }).fill(accountPassword);
      await target.locator('form button[type="submit"]').click();
      await target.waitForURL('**/admin/index.php');
    };
    await page.goto(base + '/admin/login.php');
    const initialCookie = (await context.cookies()).find(c => c.name === 'PHPSESSID');
    await login(page);
    const cookie = (await context.cookies()).find(c => c.name === 'PHPSESSID');
    assert(cookie.httpOnly && cookie.sameSite === 'Strict');
    assert.notEqual(cookie.value, initialCookie.value, 'Session ID must rotate at login');
    csrf = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const response = await context.request.get(base + '/admin/index.php');
    const policy = response.headers()['content-security-policy'];
    assert(policy.includes("frame-ancestors 'none'"));
    assert(!policy.split('script-src ')[1].split(';')[0].includes('unsafe-inline'));
    assert.equal(response.headers()['x-content-type-options'], 'nosniff');
    assert.equal(await page.locator('[onclick]').count(), 0);
    for (const section of ['analytics', 'performance', 'optimization', 'movies']) {
      await page.locator(`[data-section="${section}"]`).click();
      await page.locator(`#${section}Section`).waitFor({ state: 'visible' });
    }
    const mutate = (url, data, token = csrf, method = 'POST') => context.request.fetch(base + url, { method, headers: { 'X-CSRF-Token': token }, data });
    assert.equal((await mutate('/api/movies.php', {}, 'wrong')).status(), 403);
    assert.equal((await context.request.post(base + '/api/movies.php', { headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }, data: '{' })).status(), 400);
    assert.equal((await mutate('/api/movies.php', { title: 'x'.repeat(33000) })).status(), 413);
    assert.equal((await mutate('/api/movies.php', { tmdb_id: 2147480000, title: 'QA', download_url: 'javascript:alert(1)' })).status(), 422);
    assert.equal((await mutate('/api/performance.php?type=feature_flags', { feature_name: 'bad', rollout_percentage: 101 }, csrf, 'PUT')).status(), 422);
    assert.equal((await mutate('/api/performance.php?type=feature_flags', { feature_name: 'missing_qa_flag', is_enabled: true }, csrf, 'PUT')).status(), 404);
    assert.equal((await anonymous.request.patch(base + '/api/analytics.php')).status(), 405);
    assert.equal((await anonymous.request.post(base + '/api/analytics.php', { data: { event_type: 'search', session_id: { bad: true } } })).status(), 422);

    // Store an HTML-looking title and verify the existing server-rendered table escapes it.
    const title = 'Security QA <img src=x onerror="window.securityXss=true">';
    const created = await mutate('/api/movies.php', { tmdb_id: 2147480000, title, download_url: 'https://example.invalid/qa.mp4', source: 'Security QA' });
    assert.equal(created.status(), 200, await created.text());
    movieId = (await created.json()).data.id;
    assert.equal((await mutate('/api/movies.php?id=' + movieId, { title }, csrf, 'PUT')).status(), 200);
    assert.equal((await mutate('/api/movies.php?id=' + movieId, { tmdb_id: 2147480001 }, csrf, 'PUT')).status(), 200);
    assert.equal((await (await context.request.get(base + '/api/movies.php?id=' + movieId)).json()).data.tmdb_id, 2147480001);
    await page.reload();
    await page.getByRole('cell', { name: title, exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.securityXss), undefined);
    assert.equal(await page.locator('table img[src="x"]').count(), 0);
    await page.locator(`[data-edit-movie="${movieId}"]`).click();
    await page.getByRole('heading', { name: 'Edit Movie', exact: true }).waitFor();
    assert.equal(await page.locator('#title').inputValue(), title);
    await page.locator('#movieModal [data-bs-dismiss="modal"]').first().click();
    assert.equal((await mutate('/api/movies.php?id=' + movieId, undefined, csrf, 'DELETE')).status(), 200);
    movieId = null;

    // API-returned analytics must also be escaped before assigning innerHTML.
    await page.route('**/api/analytics.php?dashboard=true', route => route.fulfill({ json: { success: true, data: {
      page_views: { total: 1, by_page_type: [{ page_type: '<img src=x onerror="window.securityXss=true">', count: 1 }] },
      provider_clicks: { total: 1, by_provider: [{ provider: '<svg onload="window.securityXss=true">', count: 1 }] },
      search_queries: { total: 0 }, engagement: { total: 0 },
      top_content: [{ content_type: '<img src=x>', content_id: '<svg onload="window.securityXss=true">', views: 1 }]
    } } }));
    await page.locator('[data-section="analytics"]').click();
    await page.waitForFunction(() => document.getElementById('totalPageViews').textContent === '1');
    assert.equal(await page.locator('#analyticsSection img, #analyticsSection svg').count(), 0);
    assert.equal(await page.evaluate(() => window.securityXss), undefined);
    await page.unroute('**/api/analytics.php?dashboard=true');

    // Changing the QA password must revoke its other session, while keeping this one usable.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage);
    const replacement = password + 'Changed';
    assert.equal((await mutate('/admin/change_password.php', { current_password: password, new_password: 'short' })).status(), 422);
    assert.equal((await mutate('/admin/change_password.php', { current_password: password, new_password: 'x'.repeat(73) })).status(), 422);
    assert.equal((await mutate('/admin/change_password.php', { current_password: password, new_password: replacement })).status(), 200);
    assert.equal((await other.request.get(base + '/api/analytics.php?dashboard=true')).status(), 401);
    assert.equal((await context.request.get(base + '/api/analytics.php?dashboard=true')).status(), 200);
    await other.close();
    await page.reload();
    assert(page.url().endsWith('/admin/index.php'), 'Admin session after password update: ' + page.url());
    await page.locator('form[action="logout.php"] button').click();
    await page.waitForURL('**/admin/login.php');
    assert.equal((await context.request.get(base + '/api/analytics.php?dashboard=true')).status(), 401);
    assert.deepEqual(errors, []);

    // A fake account exercises throttling without locking out the owner or QA admin.
    const loginPage = await anonymous.request.get(base + '/admin/login.php');
    const loginToken = (await loginPage.text()).match(/name="csrf_token" value="([^"]+)"/)[1];
    for (let i = 0; i < 11; i++) {
      const result = await anonymous.request.post(base + '/admin/login.php', { form: { username: username + '_absent', password: 'invalid', csrf_token: loginToken } });
      assert.equal(result.status(), i === 10 ? 429 : 200);
    }
    await anonymous.close();
    console.log(JSON.stringify({ unauthorizedWrites: 'blocked', privateMetrics: 'protected', csrf: 'enforced', loginThrottle: 'passed', sessionRotationAndPasswordRevocation: 'passed', sensitiveFiles: 'blocked', cors: 'restricted', requestLimits: 'passed', storedAndDashboardXss: 'escaped', adminNavigationAndEditing: 'passed', logout: 'POST+CSRF' }));
  } finally {
    if (movieId && context && csrf) await context.request.delete(base + '/api/movies.php?id=' + movieId, { headers: { 'X-CSRF-Token': csrf } });
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
