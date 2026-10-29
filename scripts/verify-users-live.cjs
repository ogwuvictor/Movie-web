// Explicit, bounded production verification. Creates and removes its own test accounts.
// Never reads or changes an existing account's password and never logs credentials.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const folder=path.join(root,'cloudflare/generated');
const fixtureFile=path.join(folder,'users-live-fixture.local.json');
const reportFile=path.join(folder,'users-live-report.local.json');

(async()=>{
  if(!process.argv.includes('--allow-test-accounts') && !process.argv.includes('--cleanup-only'))throw Error('Use --allow-test-accounts for an intentional live test, or --cleanup-only to remove its saved fixtures.');
  const accountId=process.env.CLOUDFLARE_ACCOUNT_ID || 'a0ace774a2ea56b9edf42f863bd2282f';
  const configuration=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
  const databaseId=configuration.d1_databases.find(value=>value.binding==='DB').database_id;
  const credentialPath=path.join(process.env.APPDATA,'xdg.config/.wrangler/config/default.toml');
  const token=process.env.CLOUDFLARE_API_TOKEN || fs.readFileSync(credentialPath,'utf8').match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
  if(!token)throw Error('Sign in to Wrangler first. No credentials were printed.');
  const cf=async(route,data)=>{
    const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+accountId+route,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(30000)});
    const value=await response.json();
    if(!response.ok || !value.success)throw Error('Cloudflare operation failed: '+route+' HTTP '+response.status+' '+JSON.stringify(value.errors?.map(error=>({code:error.code,message:error.message}))));
    return value.result;
  };
  const query=async(sql,params=[])=>{
    const results=await cf('/d1/database/'+databaseId+'/query',{sql,params});
    if(!results.every(value=>value.success))throw Error('D1 verification query failed');
    return results[0].results;
  };
  const clean=async fixture=>{
    assert.equal(fixture.accountId,accountId);assert.equal(fixture.databaseId,databaseId);
    assert(/^live-audit-[a-f0-9]{12}$/.test(fixture.visitor.username));
    assert.equal(fixture.admin.username,fixture.visitor.username+'-admin');
    await query('DELETE FROM visitors WHERE username=? AND email=?',[fixture.visitor.username,fixture.visitor.email]);
    await query('DELETE FROM admin_users WHERE username=? AND email=?',[fixture.admin.username,fixture.admin.email]);
    const remaining=await query(`SELECT (SELECT COUNT(*) FROM visitors WHERE username=? AND email=?) AS visitors,
      (SELECT COUNT(*) FROM admin_users WHERE username=? AND email=?) AS admins`,[fixture.visitor.username,fixture.visitor.email,fixture.admin.username,fixture.admin.email]);
    assert.equal(remaining[0].visitors,0);assert.equal(remaining[0].admins,0);
    fs.unlinkSync(fixtureFile);
    return true;
  };
  if(process.argv.includes('--cleanup-only')) {
    if(fs.existsSync(fixtureFile))await clean(JSON.parse(fs.readFileSync(fixtureFile,'utf8')));
    console.log('Live test-account cleanup verified.');return;
  }
  if(fs.existsSync(fixtureFile))throw Error('Previous live-test fixture exists. Run --cleanup-only before another test.');
  const subdomain=await cf('/workers/subdomain');
  const base='https://'+configuration.name+'.'+subdomain.subdomain+'.workers.dev';
  const suffix=randomBytes(6).toString('hex'),name='live-audit-'+suffix;
  const fixture={accountId,databaseId,base,createdAt:new Date().toISOString(),admin:{username:name+'-admin',email:name+'-admin@example.invalid',password:'QA-'+randomBytes(24).toString('base64url')},visitor:{username:name,email:name+'@example.invalid',password:'QA-'+randomBytes(24).toString('base64url')}};
  fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(fixtureFile,JSON.stringify(fixture),{mode:0o600,flag:'wx'});
  const report={base,startedAt:new Date().toISOString(),checks:{},cleanup:false};
  let browser;
  try {
    const {accountSql}=await import('./create-admin.mjs');
    await query(await accountSql(fixture.admin.username,fixture.admin.email,fixture.admin.password));
    const {chromium}=require(path.join(require('os').tmpdir(),'moviesync-browser-tools/node_modules/playwright'));
    browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
    const admin=await browser.newContext({viewport:{width:1440,height:1000}}),page=await admin.newPage();
    const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
    report.networkFailures=[];
    page.on('requestfailed',request=>report.networkFailures.push({path:new URL(request.url()).pathname,method:request.method(),error:request.failure()?.errorText}));
    console.log('Live test: temporary admin created; checking browser sign-in.');
    assert.equal((await admin.request.get(base+'/admin/api/users.php')).status(),401);
    await page.goto(base+'/admin/login.php',{waitUntil:'domcontentloaded'});
    await page.getByLabel('Username or email').fill(fixture.admin.username);
    await page.getByLabel('Password',{exact:true}).fill(fixture.admin.password);
    const [signed]=await Promise.all([
      page.waitForResponse(r=>new URL(r.url()).pathname==='/admin/login.php' && r.request().method()==='POST',{timeout:45000}),
      page.getByRole('button',{name:'Login',exact:true}).click({noWaitAfter:true}),
    ]);
    if(signed.status()!==303) {
      const body=await signed.text();
      throw Error('Live admin sign-in returned HTTP '+signed.status()+(/1102|exceeded.*(?:CPU|resource)/i.test(body)?' (Cloudflare CPU/resource limit)':''));
    }
    await page.waitForURL(base+'/admin/',{waitUntil:'domcontentloaded'});
    report.checks.adminPasswordLogin=true;
    console.log('Live test: admin password sign-in passed.');
    const snapshot=async()=>{
      const response=await admin.request.get(base+'/admin/api/users.php');
      assert.equal(response.status(),200);assert.match(response.headers()['cache-control'],/no-store/);
      const value=await response.json();
      assert.equal(value.history.length,30);assert.equal(value.timezone,'UTC');
      const date=value.generatedAt.slice(0,10);
      const actual=(await query(`SELECT (SELECT COUNT(*) FROM visitors) AS total,
        COUNT(DISTINCT CASE WHEN activity_date=? THEN user_id END) AS daily,
        COUNT(DISTINCT CASE WHEN activity_date>=date(?,'-6 days') THEN user_id END) AS weekly,
        COUNT(DISTINCT user_id) AS monthly FROM visitor_daily_activity WHERE activity_date BETWEEN date(?,'-29 days') AND ?`,[date,date,date,date]))[0];
      for(const key of ['total','daily','weekly','monthly'])assert.equal(value[key],actual[key],'Live '+key+' must match production D1');
      assert.deepEqual({...value.history.at(-1)}, {date,daily:value.daily,weekly:value.weekly,monthly:value.monthly});
      return value;
    };
    const before=await snapshot();report.before={total:before.total,daily:before.daily,weekly:before.weekly,monthly:before.monthly};
    const visitor=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),site=await visitor.newPage();
    await site.goto(base+'/signup',{waitUntil:'domcontentloaded'});
    await site.getByLabel('Public username').fill(fixture.visitor.username);
    await site.getByLabel('Email',{exact:true}).fill(fixture.visitor.email);
    await site.getByLabel('Password',{exact:true}).fill(fixture.visitor.password);
    const [registered]=await Promise.all([
      site.waitForResponse(r=>r.url().endsWith('/api/community/register') && r.request().method()==='POST'),
      site.getByRole('button',{name:'Create account',exact:true}).click(),
    ]);
    if(registered.status()!==200) {
      const body=await registered.text();
      throw Error('Live visitor signup returned HTTP '+registered.status()+(/1102|exceeded.*(?:CPU|resource)/i.test(body)?' (Cloudflare CPU/resource limit)':''));
    }
    await site.waitForURL(base+'/profile',{waitUntil:'domcontentloaded'});
    report.checks.visitorBrowserSignup=true;
    assert.equal((await visitor.request.get(base+'/admin/api/users.php')).status(),401);
    await Promise.all([site.waitForResponse(r=>r.url().endsWith('/api/community/activity')),site.goto(base+'/',{waitUntil:'domcontentloaded'})]);
    for(let i=0;i<3;i++)assert.equal((await visitor.request.get(base+'/api/community/activity')).status(),200);
    const userRow=(await query('SELECT id FROM visitors WHERE username=? AND email=?',[fixture.visitor.username,fixture.visitor.email]))[0];
    const dailyRows=await query("SELECT COUNT(*) AS count FROM visitor_daily_activity WHERE user_id=? AND activity_date=date('now')",[userRow.id]);
    assert.equal(dailyRows[0].count,1);report.checks.repeatedActivityDeduplicated=true;
    const after=await snapshot();assert(after.total>=before.total+1);assert(after.daily>=before.daily+1);
    report.withTestVisitor={total:after.total,daily:after.daily,weekly:after.weekly,monthly:after.monthly};
    const other=await browser.newContext({viewport:{width:768,height:1024}}),otherPage=await other.newPage();
    await otherPage.goto(base+'/profile',{waitUntil:'domcontentloaded'});
    await otherPage.getByLabel('Email',{exact:true}).fill(fixture.visitor.email);
    await otherPage.getByLabel('Password',{exact:true}).fill(fixture.visitor.password);
    await otherPage.getByRole('button',{name:'Sign in',exact:true}).click();
    await otherPage.getByRole('heading',{name:fixture.visitor.username,exact:true}).waitFor();
    assert.equal((await query("SELECT COUNT(*) AS count FROM visitor_daily_activity WHERE user_id=? AND activity_date=date('now')",[userRow.id]))[0].count,1);
    report.checks.multipleSessionsDeduplicated=true;
    await page.locator('[data-section="users"]').click();
    for(const width of [390,1440]) {
      await page.setViewportSize({width,height:950});
      await page.getByRole('button',{name:'Refresh',exact:true}).click();
      await page.locator('#usersStatus').filter({hasText:'Last refreshed:'}).waitFor();
      const current=await snapshot();
      for(const [id,key] of [['registeredUsers','total'],['dailyUsers','daily'],['weeklyUsers','weekly'],['monthlyUsers','monthly']])assert.equal(await page.locator('#'+id).textContent(),current[key].toLocaleString());
      assert.equal(await page.locator('#userActivityTable tr').count(),30);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(folder,'production-users-'+width+'.png'),fullPage:true});
    }
    report.checks.liveChartAndCardsMatchD1=true;
    await page.route('**/admin/api/users.php',route=>route.fulfill({status:503,json:{error:'Simulated verification outage'}}));
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.locator('#registeredUsers').filter({hasText:'Unavailable'}).waitFor();assert.equal(await page.locator('#userActivityChart polyline').count(),0);
    await page.unroute('**/admin/api/users.php');await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.locator('#usersStatus').filter({hasText:'Last refreshed:'}).waitFor();
    report.checks.simulatedOutageClearsStaleDataAndRecovers=true;
    assert.deepEqual(pageErrors,[]);report.checks.noAdminBrowserErrors=true;
    await query('DELETE FROM visitors WHERE username=? AND email=?',[fixture.visitor.username,fixture.visitor.email]);
    const final=await snapshot();report.afterCleanup={total:final.total,daily:final.daily,weekly:final.weekly,monthly:final.monthly};
    assert.equal((await visitor.request.get(base+'/api/community/library')).status(),401);report.checks.deletedTestSessionRevoked=true;
    report.passed=true;
  } catch(error) {
    report.error=String(error.message).replaceAll(fixture.admin.password,'[redacted]').replaceAll(fixture.visitor.password,'[redacted]');
    throw Error(report.error);
  }
  finally {
    if(browser)await browser.close();
    try {report.cleanup=await clean(fixture);}finally {report.completedAt=new Date().toISOString();fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
  }
})().catch(error=>{console.error('Live user verification failed: '+error.message);process.exitCode=1;});
