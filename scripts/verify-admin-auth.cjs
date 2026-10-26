// Isolated password/session security tests. Never creates an owner account.
const assert = require('assert/strict');
const { randomBytes } = require('node:crypto');
const createDatabase = require('./cloudflare-test-db.cjs');
(async () => {
  const db = createDatabase();
  const { default: worker } = await import('../cloudflare/worker.mjs');
  const { mac } = await import('../cloudflare/auth.mjs');
  const { accountSql } = await import('./create-admin.mjs');
  const { hashPassword } = await import('../cloudflare/passwords.mjs');
  const password = 'Temporary-QA-' + randomBytes(18).toString('hex');
  const newPassword = 'Changed-QA-' + randomBytes(18).toString('hex');
  const secret = randomBytes(32).toString('hex');
  const env = { DB: db, ADMIN_SESSION_SECRET: secret, ASSETS: { fetch: async () => new Response('Public fixture') } };
  const request = (route, { method = 'GET', body, headers = {} } = {}) => new Request('https://site.example' + route, { method, headers: { 'CF-Connecting-IP': '192.0.2.1', ...headers }, ...(body === undefined ? {} : { body }) });
  const call = (route, options) => worker.fetch(request(route, options), env);
  const cookie = response => response.headers.get('Set-Cookie').split(';')[0];
  const sessionHeaders = async session => ({ Cookie: session, 'X-CSRF-Token': await mac(env, 'csrf:' + session.split('=')[1]) });
  async function form() {
    const response = await call('/admin/login.php'); assert.equal(response.status, 200);
    const html = await response.text();
    return { cookie: cookie(response), csrf: html.match(/name="csrf_token" value="([^"]+)"/)[1] };
  }
  async function login({ name = 'qa-admin', pass = password, old = '', ip = '192.0.2.1' } = {}) {
    const value = await form();
    return call('/admin/login.php?next=https://evil.example/', { method: 'POST', headers: { Cookie: value.cookie + (old ? '; ' + old : ''), 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': ip }, body: new URLSearchParams({ username: name, password: pass, csrf_token: value.csrf }) });
  }
  try {
    assert.equal((await call('/admin/')).status, 303);
    assert.equal((await call('/admin/api/analytics.php?dashboard=true')).status, 401);
    assert.equal((await call('/admin/signup')).status, 401);
    assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM admin_users').get().n, 0);
    const concurrent = await Promise.allSettled([hashPassword(password), hashPassword(password)]);
    assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(concurrent.find(result => result.status === 'rejected').reason.status, 429);
    await assert.rejects(accountSql('bad user', 'qa@example.invalid', password));
    await assert.rejects(accountSql('qa-admin', 'bad-email', password));
    await assert.rejects(accountSql('qa-admin', 'qa@example.invalid', 'short'));
    const sql = await accountSql('qa-admin', 'qa@example.invalid', password);
    assert(!sql.includes(password)); db.sql.exec(sql);
    const missingSecret = await worker.fetch(request('/admin/login.php'), { ...env, ADMIN_SESSION_SECRET: '' });
    assert.equal(missingSecret.status, 503);
    assert.equal((await call('/api/health')).status, 200);
    for (const headers of [{ Origin: 'https://evil.example' }, { 'Sec-Fetch-Site': 'cross-site' }]) assert.equal((await call('/admin/login.php', { method: 'POST', headers, body: '' })).status, 403);
    assert.equal((await call('/admin/login.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 415);
    assert.equal((await call('/admin/login.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'x'.repeat(8200) })).status, 413);
    assert.equal((await call('/admin/login.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=one&username=two' })).status, 400);
    assert.equal((await call('/admin/login.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=qa-admin&password=anything&csrf_token=bad' })).status, 403);
    const wrong = await login({ pass: 'Incorrect-password' });
    const unknown = await login({ name: 'unknown-account', pass: 'Incorrect-password' });
    assert.equal(wrong.status, 401); assert.equal(unknown.status, 401);
    for (const response of [wrong, unknown]) assert((await response.text()).includes('Invalid username/email or password.'));
    const signed = await login({ name: 'QA@EXAMPLE.INVALID' });
    assert.equal(signed.status, 303); assert.equal(signed.headers.get('Location'), '/admin/');
    const session = cookie(signed); const raw = session.split('=')[1];
    assert(/__Host-cinehub_session=[a-f0-9]{64}/.test(session));
    assert(signed.headers.get('Set-Cookie').includes('HttpOnly; SameSite=Strict; Secure'));
    assert.equal(signed.headers.get('Cache-Control'), 'no-store');
    assert(!JSON.stringify(db.sql.prepare('SELECT * FROM admin_sessions').all()).includes(raw));
    const headers = await sessionHeaders(session);
    const dashboard = await call('/admin/', { headers });
    const html = await dashboard.text(); assert.equal(dashboard.status, 200);
    assert(html.includes(headers['X-CSRF-Token']) && !html.includes(raw));
    assert(html.includes('changePasswordModal') && !html.includes('Sign-in managed by Cloudflare Access'));
    assert.equal((await call('/admin/api/analytics.php?dashboard=true', { headers: { Cookie: session + '; ' + session } })).status, 401);
    assert.equal((await call('/admin/api/analytics.php?dashboard=true', { headers: { 'Cf-Access-Jwt-Assertion': raw } })).status, 401);
    const post = { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' };
    assert.equal((await call('/admin/api/movies.php', { ...post, headers: { ...post.headers, 'X-CSRF-Token': 'bad' } })).status, 403);
    assert.equal((await call('/admin/api/movies.php', { ...post, headers: { ...post.headers, 'X-CSRF-Token': '\u00e9'.repeat(64) } })).status, 403);
    const tokenHash = await mac(env, 'session:' + raw);
    const now = Math.floor(Date.now() / 1000);
    for (const [sql, restore] of [
      ['UPDATE admin_sessions SET expires_at=1', `UPDATE admin_sessions SET expires_at=${now + 28800}`],
      [`UPDATE admin_sessions SET last_seen=${now - 1801}`, `UPDATE admin_sessions SET last_seen=${now}`],
      ['UPDATE admin_users SET disabled=1', 'UPDATE admin_users SET disabled=0'],
    ]) {
      db.sql.exec(sql); assert.equal((await call('/admin/api/analytics.php?dashboard=true', { headers })).status, 401); db.sql.exec(restore);
    }
    assert.equal((await worker.fetch(request('/admin/api/analytics.php?dashboard=true', { headers }), { ...env, ADMIN_SESSION_SECRET: randomBytes(32).toString('hex') })).status, 401);
    const rotated = await login({ old: session });
    assert.equal(rotated.status, 303); assert.notEqual(cookie(rotated), session);
    assert.equal((await call('/admin/api/analytics.php?dashboard=true', { headers })).status, 401);
    const active = cookie(rotated), activeHeaders = await sessionHeaders(active);
    assert.equal((await call('/admin/logout.php', { headers: activeHeaders })).status, 405);
    assert.equal((await call('/admin/logout.php', { method: 'POST', headers: { ...activeHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'csrf_token=bad' })).status, 403);
    assert.equal((await call('/admin/change_password.php', { ...post, headers: { ...activeHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: 'Wrong password', new_password: newPassword }) })).status, 401);
    assert.equal((await call('/admin/change_password.php', { ...post, headers: { ...activeHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: password, new_password: 'short' }) })).status, 422);
    const changed = await call('/admin/change_password.php', { ...post, headers: { ...activeHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: password, new_password: newPassword }) });
    assert.equal(changed.status, 200); assert(changed.headers.get('Set-Cookie').includes('Max-Age=0'));
    assert.equal((await call('/admin/api/analytics.php?dashboard=true', { headers: activeHeaders })).status, 401);
    assert.equal((await login()).status, 401);
    const fresh = await login({ pass: newPassword }); assert.equal(fresh.status, 303);
    const freshSession = cookie(fresh), freshHeaders = await sessionHeaders(freshSession);
    const loggedOut = await call('/admin/logout.php', { method: 'POST', headers: { ...freshHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf_token: freshHeaders['X-CSRF-Token'] }) });
    assert.equal(loggedOut.status, 303); assert.equal(loggedOut.headers.get('Location'), '/admin/login.php');
    assert.equal((await call('/admin/api/analytics.php?dashboard=true', { headers: freshHeaders })).status, 401);
    const recover = await login({ pass: newPassword }); assert.equal(recover.status, 303);
    db.sql.exec(await accountSql('qa-admin', 'qa@example.invalid', password, true));
    assert.equal((await call('/admin/api/analytics.php?dashboard=true', { headers: await sessionHeaders(cookie(recover)) })).status, 401);
    for (let i = 0; i < 10; i++) assert.equal((await login({ name: 'rate-test', ip: '192.0.2.99' })).status, 401);
    assert.equal((await login({ name: 'rate-test', ip: '192.0.2.99' })).status, 429);
    assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM admin_sessions WHERE token_hash=?').get(tokenHash).n, 0);
    db.sql.exec(require('fs').readFileSync(require('path').join(__dirname, '../cloudflare/migrations/20261026_admin_login.sql'), 'utf8'));
    assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM admin_users').get().n, 1);
    console.log('PASS password hashing, no signup/default account, generic errors, CSRF/origin/body limits, secure cookies, session rotation, idle/absolute expiry, disabled/revoked sessions, logout, password change, CLI recovery, login throttling and additive migration. Isolated SQLite only.');
    if (process.argv.includes('--browser')) {
      const { chromium } = require(require('path').join(require('os').tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
      const server = require('http').createServer(async (req, res) => {
        try {
          const chunks = []; for await (const chunk of req) chunks.push(chunk);
          const data = Buffer.concat(chunks);
          const response = await worker.fetch(new Request('http://127.0.0.1:' + server.address().port + req.url, { method: req.method, headers: { ...req.headers, 'CF-Connecting-IP': '192.0.2.200' }, ...(data.length ? { body: data } : {}) }), env);
          res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) { console.error(error); res.writeHead(500); res.end('Test bridge failed'); }
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const base = 'http://127.0.0.1:' + server.address().port;
      const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
      try {
        for (const width of [390, 1440]) {
          const context = await browser.newContext({ viewport: { width, height: 900 } });
          const page = await context.newPage();
          await page.goto(base + '/admin/'); await page.waitForURL('**/admin/login.php');
          await page.getByLabel('Username or email').fill('qa@example.invalid');
          await page.getByLabel('Password', { exact: true }).fill('Wrong password');
          await page.getByRole('button', { name: 'Login' }).click(); await page.getByRole('alert').waitFor();
          await page.getByLabel('Username or email').fill('qa@example.invalid');
          await page.getByLabel('Password', { exact: true }).fill(password);
          await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL(base + '/admin/');
          const sessionCookie = (await context.cookies()).find(item => item.name === 'cinehub_session');
          assert(sessionCookie.httpOnly && sessionCookie.sameSite === 'Strict');
          assert.equal((await context.request.get(base + '/admin/api/analytics.php?dashboard=true')).status(), 200);
          await page.getByRole('button', { name: /Logout/ }).click(); await page.waitForURL('**/admin/login.php');
          assert.equal((await context.request.get(base + '/admin/api/analytics.php?dashboard=true')).status(), 401);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await context.close();
          console.log(`PASS ${width}px Chrome real form login, failed login, dashboard authorization and logout. Local Worker handler with SQLite adapter.`);
        }
      } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
    }
  } finally { db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
