// Production React bundle + actual Worker handlers + isolated SQLite. No live records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const createDatabase = require('./cloudflare-test-db.cjs');
(async () => {
  const db = createDatabase(), root = path.resolve(__dirname, '../build');
  const { default: worker } = await import('../cloudflare/worker.mjs');
  const env = { DB: db, ADMIN_SESSION_SECRET: randomBytes(32).toString('hex'), ASSETS: { fetch: async request => {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url).pathname));
    if (!file.startsWith(root + path.sep) && file !== root) return new Response('Forbidden', { status: 403 });
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
    const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json' };
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' };
    for (const line of fs.readFileSync(path.join(root, '_headers'), 'utf8').split('\n')) { const match = line.match(/^  ([\w-]+): (.+)$/); if (match) headers[match[1]] = match[2]; }
    return new Response(fs.readFileSync(file), { headers });
  } } };
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const data = Buffer.concat(chunks);
      const response = await worker.fetch(new Request('http://' + req.headers.host + req.url, { method: req.method, headers: { ...req.headers, 'CF-Connecting-IP': '192.0.2.' + (req.headers['x-qa-ip'] || '80') }, ...(data.length ? { body: data } : {}) }), env);
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
    } catch (e) { console.error(e); res.writeHead(500); res.end('QA bridge error'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const { chromium } = require(path.join(require('os').tmpdir(), 'moviesync-browser-tools/node_modules/playwright'));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const sizes = [{width:320,height:640},{width:390,height:844},{width:844,height:390},{width:768,height:1024},{width:1440,height:900}];
    for (const [sizeIndex, viewport] of sizes.entries()) {
      const {width,height}=viewport;
      let showProviders=false;
      const context = await browser.newContext({ viewport, extraHTTPHeaders: { 'x-qa-ip': String(81+sizeIndex) } });
      await context.route('**/api.themoviedb.org/3/**', route => {
        const pathname = new URL(route.request().url()).pathname;
        let data = { results: [], genres: [] };
        if (pathname.endsWith('/search/multi')) data = { results: [
          { id: 550, title: 'QA movie', media_type: 'movie' },
          { id: 1399, name: 'QA series', media_type: 'tv' },
        ] };
        if (/\/movie\/550$/.test(pathname)) data = { id: 550, title: 'QA movie', overview: 'Test film metadata', genres: [], runtime: 90, vote_average: 8 };
        if (/\/tv\/1399$/.test(pathname)) data = { id: 1399, name: 'QA series', overview: 'Test series metadata', genres: [], seasons: [], vote_average: 8 };
        if(pathname.endsWith('/watch/providers')) data={results:showProviders?{US:{flatrate:[{provider_id:8,provider_name:'Netflix'}]}}:{}};
        return route.fulfill({ json: data });
      });
      await context.route('https://placehold.co/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150"></svg>'}));
      const page = await context.newPage(), errors = [], reviewRequests=[];
      await page.goto(base);
      if (!await page.getByRole('link', { name: 'Search movies and TV shows', exact: true }).isVisible()) {
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
      }
      await page.getByRole('link', { name: 'Search movies and TV shows', exact: true }).click();
      await page.getByRole('heading', { name: 'Search', exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/search');
      assert.equal(await page.locator('.home-page').count(), 0);
      assert.equal(await page.locator('.navbar-search-launcher').count(), 0);
      if (width < 992) assert.equal(await page.getByRole('button', { name: 'Toggle navigation' }).getAttribute('aria-expanded'), 'false');
      assert.equal(await page.getByRole('searchbox').count(), 1);
      assert.equal(await page.getByRole('searchbox', { name: 'Search', exact: true }).evaluate(el => document.activeElement === el), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      fs.mkdirSync(path.resolve(__dirname, '../cloudflare/generated'), { recursive: true });
      await page.screenshot({ path: path.resolve(__dirname, `../cloudflare/generated/search-empty-${width}.png`) });
      await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('QA');
      await page.locator('.search-results-grid .movie-row-card').first().waitFor();
      assert.equal(await page.locator('.search-results-grid .movie-row-card').count(), 2);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.resolve(__dirname, `../cloudflare/generated/search-results-${width}.png`) });
      if (process.argv.includes('--search-only')) {
        console.log(`PASS ${width}px Chrome: one search input, dedicated page, results grid, autofocus and no overflow.`);
        await context.close();
        continue;
      }
      page.on('pageerror', error => errors.push(error.message));
      page.on('request',request=>{if(request.url().includes('/api/community/reviews'))reviewRequests.push(request.url());});
      const pass = 'QA-visitor-' + randomBytes(16).toString('hex'), email = 'browser' + width + (width===320?'a'.repeat(140):'') + '@example.invalid';
      await page.goto(base + '/moviedetails/550');
      if(width<=575) {
        await page.getByRole('button',{name:'Watch Now',exact:true}).waitFor();
        const play=await page.locator('.movie-action-trailer').boundingBox(),watch=await page.locator('.movie-action-watch').boundingBox();
        assert(Math.abs(play.y-watch.y)<1 && play.height>=44 && play.height<=48 && watch.height>=44 && watch.height<=48,'Phone playback buttons must share one compact row');
        assert(await page.locator('.movie-provider-unavailable').isHidden());
        assert(await page.locator('.movie-provider-note').isVisible());
        await page.locator('.movie-actions').screenshot({path:path.join(root,'../cloudflare/generated/mobile-actions-'+width+'-unavailable.png')});
      }
      await page.getByRole('button', { name: 'Add to watchlist', exact: true }).click();
      await page.getByRole('dialog', { name: 'Sign in to CineHub' }).waitFor();
      const dialogBounds=await page.getByRole('dialog').boundingBox();
      assert(dialogBounds.x>=0 && dialogBounds.x+dialogBounds.width<=width && dialogBounds.y>=0 && dialogBounds.y+dialogBounds.height<=height,'Login popup must fit viewport');
      assert(await page.getByLabel('Email',{exact:true}).evaluate(input=>parseFloat(getComputedStyle(input).fontSize)>=16),'Phone input text must avoid focus zoom');
      await page.screenshot({path:path.join(root,'../cloudflare/generated/visitor-popup-'+width+'.png')});
      if(width===390) {
        await page.setViewportSize({width,height:320});
        const small=await page.getByRole('dialog').boundingBox(); assert(small.height<=320);
        await page.setViewportSize(viewport);
      }
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Add to watchlist', exact: true }).click();
      await page.getByRole('dialog').getByRole('link', { name: 'Sign up', exact: true }).click();
      await page.waitForURL('**/signup?returnTo=*');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Signup must not overflow');
      await page.screenshot({path:path.join(root,'../cloudflare/generated/visitor-signup-'+width+'.png'),fullPage:true});
      await page.getByLabel('Public username').fill('browser' + width);
      await page.getByLabel('Email', { exact: true }).fill(email);
      await page.getByLabel('Password', { exact: true }).fill(pass);
      await page.locator('form.community-form').getByRole('button', { name: 'Create account', exact: true }).click();
      await page.waitForURL(base + '/moviedetails/550',{waitUntil:'domcontentloaded'});
      await page.getByRole('link', { name: 'My profile', exact: true }).waitFor();
      await page.goto(base+'/profile');
      await page.getByRole('heading',{name:'Your next watch starts here',exact:true}).waitFor();
      if(width===390) {
        const visitorCookie=(await context.cookies()).find(cookie=>cookie.name==='cinehub_visitor');
        assert(visitorCookie?.httpOnly && visitorCookie.expires-Date.now()/1000>29*86400,'Visitor cookie must persist for approximately 30 days');
        db.sql.prepare("UPDATE visitor_sessions SET last_seen=unixepoch()-7200 WHERE user_id=(SELECT id FROM visitors WHERE username=?)").run('browser'+width);
        await page.reload();
        await page.getByRole('heading',{name:'Your next watch starts here',exact:true}).waitFor();
        // Browser restart simulation: reuse the browser's stored persistent cookies.
        const returning=await browser.newContext({viewport,storageState:await context.storageState()});
        const returnPage=await returning.newPage();await returnPage.goto(base+'/profile');
        await returnPage.getByRole('heading',{name:'Your next watch starts here',exact:true}).waitFor();
        await returning.close();
        console.log('PASS visitor session survives two hours without requests, profile reload and restored browser cookies.');
      }
      assert.equal(await page.getByRole('button',{name:'Next',exact:true}).count(),0,'Empty library must not show useless pagination');
      await page.screenshot({path:path.join(root,'../cloudflare/generated/visitor-empty-'+width+'.png'),fullPage:true});
      await page.goto(base+'/moviedetails/550');
      await page.getByRole('button', { name: 'Add favorite', exact: true }).click();
      await page.getByRole('button', { name: 'Favorited', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Add to watchlist', exact: true }).click();
      await page.getByRole('button', { name: 'In watchlist', exact: true }).waitFor();
      assert.equal(await page.getByRole('heading',{name:'Community reviews',exact:true}).count(),0);
      const contrast=await page.getByRole('button',{name:'Favorited',exact:true}).evaluate(button=>{
        const style=getComputedStyle(button), luminance=color=>{const values=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
        const a=luminance(style.color),b=luminance(style.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      });
      assert(contrast>=4.5,'Saved label contrast must remain readable');
      await page.route('**/api/community/library',route=>route.request().method()==='DELETE'?route.fulfill({status:503,json:{error:'Fixture write failure'}}):route.continue());
      await page.getByRole('button',{name:'Favorited',exact:true}).click();
      await page.getByRole('alert').filter({hasText:'Could not update your favorites.'}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Favorited',exact:true}).getAttribute('aria-pressed'),'true','Failed save must not pretend success');
      await page.unroute('**/api/community/library');
      await page.getByRole('button',{name:'Favorited',exact:true}).click();
      await page.getByRole('button',{name:'Add favorite',exact:true}).waitFor();
      await page.getByRole('button',{name:'Add favorite',exact:true}).click();
      await page.getByRole('button',{name:'Favorited',exact:true}).waitFor();
      await page.reload();
      await page.getByRole('button', { name: 'Favorited', exact: true }).waitFor();
      await page.goto(base + '/tv/1399');
      await page.getByRole('button', { name: 'Add to watchlist', exact: true }).click();
      await page.getByRole('button', { name: 'In watchlist', exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.goto(base + '/account');
      await page.getByRole('link', { name: 'QA series', exact: true }).waitFor();
      await page.getByRole('tab',{name:/Favorites/}).click();
      await page.getByRole('link',{name:'QA movie',exact:true}).waitFor();
      assert.equal(await page.getByRole('link',{name:'QA series',exact:true}).count(),0);
      await page.getByRole('tab',{name:/Watchlist/}).click();
      await page.getByRole('link',{name:'QA series',exact:true}).waitFor();
      await page.getByLabel('Filter saved titles').selectOption('tv');
      await page.getByRole('link',{name:'QA series',exact:true}).waitFor();
      assert.equal(await page.getByRole('link',{name:'QA movie',exact:true}).count(),0);
      await page.getByLabel('Filter saved titles').selectOption('');
      await page.getByRole('link',{name:'QA movie',exact:true}).waitFor();
      await page.getByRole('button', { name: 'Remove QA series from watchlist', exact: true }).click();
      await page.getByRole('link', { name: 'QA series', exact: true }).waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await page.getByRole('link', { name: 'Sign up', exact: true }).waitFor();
      await page.screenshot({path:path.join(root,'../cloudflare/generated/visitor-login-'+width+'.png'),fullPage:true});
      await page.goto(base + '/tv/1399');
      await page.getByRole('button', { name: 'Add to watchlist', exact: true }).click();
      const popup = page.getByRole('dialog', { name: 'Sign in to CineHub' });
      await popup.getByLabel('Email', { exact: true }).fill(email);
      await popup.getByLabel('Password', { exact: true }).fill('wrong password');
      await popup.getByRole('button', { name: 'Sign in', exact: true }).click();
      await popup.getByRole('alert').filter({ hasText: 'Invalid email or password.' }).waitFor();
      await popup.getByLabel('Password', { exact: true }).fill(pass);
      await popup.getByRole('button', { name: 'Sign in', exact: true }).click();
      await popup.waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'In watchlist', exact: true }).waitFor();
      await page.goto(base + '/profile');
      await page.getByRole('heading',{name:'browser'+width,exact:true}).waitFor();
      await page.getByRole('link', { name: 'QA movie', exact: true }).first().waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      assert.deepEqual(reviewRequests,[],'Disabled reviews must not be requested');
      fs.mkdirSync(path.join(root, '../cloudflare/generated'), { recursive: true });
      await page.screenshot({ path: path.join(root, '../cloudflare/generated/visitor-account-' + width + '.png'), fullPage: true });
      if(width<=575) {
        showProviders=true;
        for(const detail of ['/moviedetails/550','/tv/1399']) {
          await page.goto(base+detail);
          await page.getByRole('button',{name:'Where to Watch',exact:true}).waitFor();
          const a=await page.locator('.movie-action-trailer').boundingBox(),b=await page.locator('.movie-action-watch').boundingBox(),provider=await page.locator('.movie-provider-action').boundingBox();
          assert(Math.abs(a.y-b.y)<1 && a.height<=48 && b.height<=48 && provider.height<=44,'Movie/TV actions must stay compact');
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        }
        await page.locator('.movie-actions').screenshot({path:path.join(root,'../cloudflare/generated/mobile-actions-'+width+'-providers.png')});
      }
      await context.close();
      console.log('PASS ' + width + 'px Chrome: redesigned auth/profile, guest login/signup, readable saved states, failure/retry, persistent favorites/watchlist, collection tabs/media filters, empty states, reviews removed, logout and no overflow.');
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
