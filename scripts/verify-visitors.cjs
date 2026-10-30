const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const createDatabase = require('./cloudflare-test-db.cjs');
(async () => {
  const db = createDatabase();
  const { default: worker } = await import('../cloudflare/worker.mjs');
  const env = { DB: db, ADMIN_SESSION_SECRET: randomBytes(32).toString('hex'), ASSETS: { fetch: async () => new Response('fixture') } };
  const password = 'Visitor-QA-' + randomBytes(16).toString('hex');
  const call = (path, { method = 'GET', data, cookie, csrf, origin } = {}) => worker.fetch(new Request('https://site.example' + path, {
    method, headers: { 'CF-Connecting-IP': '192.0.2.45', ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(origin ? { Origin: origin } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }), env);
  const api = (path, options) => call('/api/community/' + path, options);
  const cookieOf = r => r.headers.get('Set-Cookie').split(';')[0];
  async function register(username, email) {
    const bootstrap = await api('session'), pre = await bootstrap.json();
    const result = await api('register', { method: 'POST', cookie: cookieOf(bootstrap), csrf: pre.csrf, data: { username, email, password } });
    assert.equal(result.status, 200, await result.clone().text());
    const value = await result.json();
    return { cookie: cookieOf(result), csrf: value.csrf, method: 'PUT' };
  }
  try {
    assert.equal((await api('library')).status, 401);
    assert.equal((await api('register', { method: 'POST', data: {} })).status, 403);
    const alice = await register('alice', 'alice@example.invalid');
    // Another person's login must not purge a viewer watching an embedded film.
    db.sql.prepare('UPDATE visitor_sessions SET last_seen=last_seen-7200').run();
    const bob = await register('bob', 'bob@example.invalid');
    assert.equal((await api('library',{cookie:alice.cookie})).status,200);
    const {mac}=await import('../cloudflare/auth.mjs');
    const {VISITOR_SESSION_IDLE_SECONDS,VISITOR_SESSION_MAX_SECONDS}=await import('../cloudflare/visitors.mjs');
    const aliceDigest=await mac(env,'visitor-session:'+alice.cookie.split('=')[1]);
    const timestamp=Math.floor(Date.now()/1000);
    const originalExpiry=db.sql.prepare('SELECT expires_at FROM visitor_sessions WHERE token_hash=?').get(aliceDigest).expires_at;
    assert(Math.abs(originalExpiry-timestamp-VISITOR_SESSION_MAX_SECONDS)<5);
    db.sql.prepare('UPDATE visitor_sessions SET last_seen=? WHERE token_hash=?').run(timestamp-6*86400,aliceDigest);
    assert.equal((await api('library',{cookie:alice.cookie})).status,200,'A six-day return visit stays signed in');
    assert.equal(db.sql.prepare('SELECT expires_at FROM visitor_sessions WHERE token_hash=?').get(aliceDigest).expires_at,originalExpiry,'Activity must not remove the absolute limit');
    assert.equal(db.sql.prepare('SELECT COUNT(DISTINCT user_id) n FROM visitor_daily_activity').get().n,2);
    const ping = await api('activity'); assert.equal((await ping.json()).authenticated,false); assert(ping.headers.get('Set-Cookie').startsWith('__Host-cinehub_anonymous='));
    const guestForm=await api('session'),guestCookie=cookieOf(guestForm),guestToken=(await guestForm.json()).csrf;
    const repeatedGuest=await api('session',{cookie:guestCookie});assert.equal((await repeatedGuest.json()).csrf,guestToken);assert.equal(repeatedGuest.headers.get('Set-Cookie'),null);
    assert.equal((await (await api('activity',{cookie:alice.cookie})).json()).authenticated,true);
    assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM anonymous_daily_activity').get().n,1,'Authenticated requests must not add anonymous activity');
    assert.equal(db.sql.prepare('SELECT COUNT(*) n FROM visitor_daily_activity').get().n,2);
    assert(alice.cookie.startsWith('__Host-cinehub_visitor='));
    const record = db.sql.prepare('SELECT password_hash FROM visitors LIMIT 1').get();
    assert(record.password_hash.startsWith('scrypt$')); assert(!record.password_hash.includes(password));
    assert.equal((await call('/admin/api/analytics.php?dashboard=true', alice)).status, 401);
    assert.equal((await call('/admin/api/users.php', {cookie:alice.cookie})).status,401);
    assert.equal((await api('library', { ...alice, csrf: 'wrong', data: {} })).status, 403);
    assert.equal((await api('library', { ...alice, origin: 'https://evil.example', data: {} })).status, 403);
    const title = { type: 'movie', id: 550, list: 'favorite', title: '<script>title</script>', poster_path: '/poster.jpg' };
    for (const data of [title, title, { ...title, list: 'watchlist' }, { ...title, type: 'tv' }]) assert.equal((await api('library', { ...alice, data })).status, 200);
    assert.equal((await (await api('library', { cookie: alice.cookie })).json()).items.length, 3);
    assert.equal((await (await api('library', { cookie: bob.cookie })).json()).items.length, 0);
    assert.equal((await api('library', { ...alice, data: { ...title, poster_path: 'https://evil.example/x' } })).status, 422);
    assert.equal((await api('library', { ...alice, data: { ...title, type: 'person' } })).status, 422);
    // Reviews are paused without destroying previously stored content.
    db.sql.prepare("INSERT INTO visitor_reviews(user_id,media_type,tmdb_id,rating,review) VALUES (1,'movie',550,8,'Preserved review')").run();
    for(const method of ['GET','PUT','DELETE']) assert.equal((await api('reviews?type=movie&id=550',{...alice,method,...(method==='GET'?{}:{data:{type:'movie',id:550,rating:8,review:'Not accepted'}})})).status,404);
    assert.equal(db.sql.prepare('SELECT review FROM visitor_reviews WHERE user_id=1').get().review,'Preserved review');
    const filtered=await (await api('library?list=favorite&type=tv',{cookie:alice.cookie})).json();
    assert.equal(filtered.items.length,1);assert.equal(filtered.total,1);assert.deepEqual(filtered.counts,{favorite:2,watchlist:1});
    assert.equal((await api('library?list=invalid',{cookie:alice.cookie})).status,422);
    assert.equal((await api('library?type=person',{cookie:alice.cookie})).status,422);
    const own = await (await api('title?type=movie&id=550', { cookie: alice.cookie })).json();
    assert.equal(own.review, undefined); assert.deepEqual(own.lists.sort(), ['favorite','watchlist']);
    assert.equal((await api('library', { ...alice, method: 'DELETE', data: title })).status, 200);
    assert.equal((await (await api('library', { cookie: alice.cookie })).json()).items.length, 2);
    // Pagination remains bounded even for long saved lists and popular titles.
    for (let i = 1; i <= 52; i++) db.sql.prepare("INSERT INTO visitor_library(user_id,media_type,tmdb_id,list,title) VALUES (1,'movie',?,'favorite','QA')").run(1000+i);
    assert.equal((await (await api('library', { cookie: alice.cookie })).json()).items.length, 50);
    assert.equal((await (await api('library?page=2', { cookie: alice.cookie })).json()).items.length, 4);
    const favoritePage=await (await api('library?list=favorite&page=2',{cookie:alice.cookie})).json();assert.equal(favoritePage.items.length,3);assert.equal(favoritePage.total,53);assert.equal(favoritePage.counts.watchlist,1);
    const bootstrap = await api('session'); const pre = await bootstrap.json();
    const options = { method: 'POST', cookie: cookieOf(bootstrap), csrf: pre.csrf };
    assert.equal((await api('login', { ...options, data: { email: 'alice@example.invalid', password: 'wrong' } })).status, 401);
    const signedIn = await api('login', { ...options, data: { email: 'ALICE@example.invalid', password } });
    assert.equal(signedIn.status, 200);
    for(const attribute of ['Max-Age='+VISITOR_SESSION_MAX_SECONDS,'HttpOnly','Secure','SameSite=Strict'])assert(signedIn.headers.get('Set-Cookie').includes(attribute));
    const auth = await signedIn.json(), cookie = cookieOf(signedIn);
    assert.equal(auth.user.username, 'alice');
    assert.equal((await api('logout', { method: 'POST', cookie, csrf: auth.csrf })).status, 200);
    assert.equal((await api('library', { cookie })).status, 401);
    db.sql.prepare('UPDATE visitor_sessions SET expires_at=?,last_seen=? WHERE token_hash=?').run(timestamp-1,timestamp,aliceDigest);
    assert.equal((await api('library',{cookie:alice.cookie})).status,401,'A fresh activity timestamp cannot revive an expired session');
    db.sql.prepare('UPDATE visitor_sessions SET expires_at=?,last_seen=? WHERE token_hash=?').run(timestamp+86400,timestamp-VISITOR_SESSION_IDLE_SECONDS,aliceDigest);
    assert.equal((await api('library',{cookie:alice.cookie})).status,401,'Seven days without activity expires the session');
    db.sql.prepare('UPDATE visitor_sessions SET last_seen=0').run();
    assert.equal((await api('library', { cookie: alice.cookie })).status, 401);
    const session = await (await api('session', { cookie: alice.cookie })).json(); assert.equal(session.user, null);
    console.log('PASS visitor signup/login/logout, admin isolation, CSRF/origin, private filtered lists and counts, movie/TV identity, reviews disabled with data preserved, bounded pagination and session expiry.');
  } finally { db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
