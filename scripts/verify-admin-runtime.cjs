// Requires the disposable local Wrangler fixture prepared for runtime QA.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require(path.join(require('os').tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
(async () => {
  if (process.argv.includes('--prepare')) {
    const { randomBytes } = require('node:crypto');
    const { accountSql } = await import('./create-admin.mjs');
    const root = path.resolve(__dirname, '..');
    const folder = path.join(root, 'cloudflare/generated');
    fs.mkdirSync(folder, { recursive: true });
    const fixture = { username: 'runtime-qa', email: 'runtime-qa@example.invalid', password: 'Runtime-QA-' + randomBytes(18).toString('hex'), secret: randomBytes(32).toString('hex') };
    const state = 'cloudflare/generated/auth-runtime-state-' + Date.now();
    fs.writeFileSync(path.join(folder, 'auth-runtime-fixture.local.json'), JSON.stringify(fixture), { mode: 0o600 });
    fs.writeFileSync(path.join(folder, 'auth-runtime-seed.sql'), fs.readFileSync(path.join(root, 'cloudflare/schema.sql'), 'utf8') + '\n' + await accountSql(fixture.username, fixture.email, fixture.password), { mode: 0o600 });
    fs.writeFileSync(path.join(folder, 'auth-qa.wrangler.json'), JSON.stringify({
      name: 'cinehub-auth-qa', main: path.join(root, 'cloudflare/worker.mjs'), compatibility_date: '2026-10-23', compatibility_flags: ['nodejs_compat'],
      assets: { directory: path.join(root, 'build'), binding: 'ASSETS', run_worker_first: ['/admin/*', '/api/*'] },
      vars: { ADMIN_SESSION_SECRET: fixture.secret }, d1_databases: [{ binding: 'DB', database_name: 'cinehub-auth-qa', database_id: '00000000-0000-0000-0000-000000000001' }],
    }), { mode: 0o600 });
    console.log('Temporary local QA files prepared. Stop any previous auth QA emulator before preparing a new fixture. No remote resources or owner credentials changed.');
    console.log(`npx wrangler@4.152.0 d1 execute cinehub-auth-qa --local --config cloudflare/generated/auth-qa.wrangler.json --persist-to ${state} --file cloudflare/generated/auth-runtime-seed.sql --yes`);
    console.log(`npx wrangler@4.152.0 dev --config cloudflare/generated/auth-qa.wrangler.json --port 8791 --persist-to ${state}`);
    console.log('Then, in another terminal: node scripts/verify-admin-runtime.cjs');
    return;
  }
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../cloudflare/generated/auth-runtime-fixture.local.json'), 'utf8'));
  const base = 'http://127.0.0.1:8791';
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/admin/'); await page.waitForURL('**/admin/login.php');
      await page.getByLabel('Username or email').fill(fixture.email);
      await page.getByLabel('Password', { exact: true }).fill('Incorrect-password');
      await page.getByRole('button', { name: 'Login' }).click();
      await page.getByRole('alert').waitFor();
      await page.getByLabel('Username or email').fill(fixture.username);
      await page.getByLabel('Password', { exact: true }).fill(fixture.password);
      await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL(base + '/admin/');
      assert.equal((await context.request.get(base + '/admin/api/analytics.php?dashboard=true')).status(), 200);
      await page.getByRole('link', { name: 'Streaming Availability', exact: true }).click();
      await page.getByRole('heading', { name: 'Streaming Availability', exact: true }).waitFor();
      await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
      if (width === 1440) {
        const changed = fixture.password + '-changed';
        await page.getByRole('link', { name: /Change Password/ }).click();
        await page.locator('#currentPassword').fill(fixture.password);
        await page.locator('#newPassword').fill(changed);
        await page.locator('#confirmPassword').fill(changed);
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Change Password', exact: true }).click();
        await page.waitForURL('**/admin/login.php');
        assert.equal((await context.request.get(base + '/admin/api/analytics.php?dashboard=true')).status(), 401);
        await page.getByLabel('Username or email').fill(fixture.username);
        await page.getByLabel('Password', { exact: true }).fill(changed);
        await page.getByRole('button', { name: 'Login' }).click(); await page.waitForURL(base + '/admin/');
      }
      const token = (await context.cookies()).find(cookie => cookie.name === 'cinehub_session');
      assert(token.httpOnly && token.sameSite === 'Strict');
      await page.getByRole('button', { name: /Logout/ }).click(); await page.waitForURL('**/admin/login.php');
      assert.equal((await context.request.get(base + '/admin/api/analytics.php?dashboard=true')).status(), 401);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(__dirname, `../cloudflare/generated/admin-login-${width}.png`) });
      console.log(`PASS ${width}px: real local workerd + D1 + native scrypt form login, rejection, dashboard/catalog access and logout${width === 1440 ? ', password-change UI and re-login' : ''}. Production CPU limits not verified.`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
