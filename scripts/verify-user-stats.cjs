const assert=require('node:assert/strict');
const createDatabase=require('./cloudflare-test-db.cjs');
const {randomBytes}=require('node:crypto');
(async()=>{
  const db=createDatabase();
  const {userStatistics,recordVisitorActivity}=await import('../cloudflare/user-stats.mjs');
  const {default:worker}=await import('../cloudflare/worker.mjs');
  const {accountSql}=await import('./create-admin.mjs');
  try {
    const at=new Date('2026-11-01T23:59:59Z'), dayAgo=n=>new Date(at.getTime()-n*86400000).toISOString().slice(0,10);
    db.sql.prepare("UPDATE visitor_activity_settings SET started_at='2026-09-01 00:00:00'").run();
    for(let id=1;id<=7;id++)db.sql.prepare('INSERT INTO visitors(id,username,email,password_hash) VALUES (?,?,?,?)').run(id,'fixture'+id,'fixture'+id+'@example.invalid','not-a-login-hash');
    for(const [id,days] of [[1,0],[1,1],[2,6],[3,7],[4,29],[5,30],[6,-1]])db.sql.prepare('INSERT INTO visitor_daily_activity(user_id,activity_date,last_seen) VALUES (?,?,?)').run(id,dayAgo(days),Math.floor(at.getTime()/1000)-days*86400);
    let data=await userStatistics(db,at);
    assert.equal(data.total,7);assert.equal(data.daily,1);assert.equal(data.weekly,2);assert.equal(data.monthly,4);
    assert.equal(data.history.length,30);assert.deepEqual(data.history.at(-1),{date:'2026-11-01',daily:1,weekly:2,monthly:4});
    assert.equal(data.partialHistory,false);assert(!JSON.stringify(data).includes('@example'));
    // Midnight, repeat requests and multiple sessions never double-count an account.
    const midnight=Date.parse('2026-11-01T00:00:00Z')/1000;
    await recordVisitorActivity(db,7,midnight);await recordVisitorActivity(db,7,midnight+10);await recordVisitorActivity(db,7,midnight+120);
    assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM visitor_daily_activity WHERE user_id=7 AND activity_date='2026-11-01'").get().n,1);
    data=await userStatistics(db,at);assert.equal(data.daily,2);assert.equal(data.weekly,3);assert.equal(data.monthly,5);
    db.sql.prepare("UPDATE visitor_activity_settings SET started_at='2026-10-03 12:00:00'").run();
    assert.equal((await userStatistics(db,at)).partialHistory,true,'A partial first calendar day is not full tracking history');
    // A fresh deployment has missing history, not invented zero-valued old days.
    db.sql.prepare("UPDATE visitor_activity_settings SET started_at='2026-11-01 12:00:00'").run();
    data=await userStatistics(db,at);assert.equal(data.partialHistory,true);assert.equal(data.history[0].daily,null);assert.equal(data.history.at(-1).daily,2);
    const password='Admin-stats-QA-'+randomBytes(16).toString('hex');
    db.sql.exec(await accountSql('stats-admin','stats-admin@example.invalid',password));
    const env={DB:db,ADMIN_SESSION_SECRET:randomBytes(32).toString('hex'),ASSETS:{fetch:async()=>new Response('fixture')}};
    const call=(route,options={})=>worker.fetch(new Request('https://site.example'+route,options),env);
    assert.equal((await call('/admin/api/users.php')).status,401);
    assert.equal((await call('/api/users.php')).status,401);
    assert.equal((await call('/admin/users.js')).status,401);
    const form=await call('/admin/login.php'),html=await form.text(),csrf=html.match(/name="csrf_token" value="([^"]+)"/)[1];
    const login=await call('/admin/login.php',{method:'POST',headers:{Cookie:form.headers.get('Set-Cookie').split(';')[0],'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'stats-admin',password,csrf_token:csrf})});
    assert.equal(login.status,303);const cookie=login.headers.get('Set-Cookie').split(';')[0];
    const response=await call('/admin/api/users.php',{headers:{Cookie:cookie}});assert.equal(response.status,200);assert.equal((await response.json()).total,7);
    assert.equal((await call('/admin/api/users.php',{method:'POST',headers:{Cookie:cookie}})).status,405);
    const dashboard=await (await call('/admin/',{headers:{Cookie:cookie}})).text();
    for(const removed of ['optimizationSection','cacheMetricsTable','totalEngagement'])assert(!dashboard.includes(removed),removed+' should be removed');
    assert(dashboard.includes('userActivityChart'));
    // Both migrations are additive and repeatable.
    db.sql.exec(require('fs').readFileSync(require('path').join(__dirname,'../cloudflare/migrations/20261026_user_activity.sql'),'utf8'));
    assert.equal((await userStatistics(db,at)).total,7);
    console.log('PASS real registered/unique DAU-WAU-MAU counts, UTC boundaries, deduplication, rolling-window cutoffs, future exclusion, missing-history labels, protected statistics and dashboard cleanup.');
  } finally { db.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
