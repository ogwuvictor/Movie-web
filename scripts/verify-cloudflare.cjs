// Exercises the real Worker code with SQLite and temporary password/session fixtures.
// This does not test Cloudflare's live sign-in service or a deployed D1 database.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const createDatabase = require('./cloudflare-test-db.cjs');
(async () => {
  const db = createDatabase();
  const { default: worker } = await import('../cloudflare/worker.mjs');
  const { mac } = await import('../cloudflare/auth.mjs');
  const { accountSql } = await import('./create-admin.mjs');
  const password = 'QA-private-' + randomBytes(16).toString('hex');
  db.sql.exec(await accountSql('qa-admin', 'qa@example.invalid', password));
  const originalFetch=global.fetch;
  const env={DB:db,ADMIN_SESSION_SECRET:randomBytes(32).toString('hex'),ASSETS:{fetch:async()=>new Response('Static fixture')}};
  const formResponse=await worker.fetch(new Request('https://site.example/admin/login.php'),env);
  const formHtml=await formResponse.text();
  const formToken=formHtml.match(/name="csrf_token" value="([^"]+)"/)[1];
  const signedIn=await worker.fetch(new Request('https://site.example/admin/login.php',{method:'POST',headers:{Cookie:formResponse.headers.get('Set-Cookie').split(';')[0],'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf_token:formToken,username:'qa-admin',password})}),env);
  assert.equal(signedIn.status,303,await signedIn.clone().text());
  const token=signedIn.headers.get('Set-Cookie').split(';')[0].split('=')[1];
  const csrf=await mac(env,'csrf:'+token);
  const call=async (route,{method='GET',data,auth=false,session=token,token:csrfValue=csrf,headers={}}={}) => worker.fetch(new Request('https://site.example'+(auth&&route.startsWith('/api/')&&route!=='/api/health'?route.replace('/api/','/admin/api/'):route),{method,headers:{...(auth?{Cookie:'__Host-cinehub_session='+session,'X-CSRF-Token':csrfValue}:{}),...(data===undefined?{}:{'Content-Type':'application/json'}),...headers},...(data===undefined?{}:{body:typeof data==='string'?data:JSON.stringify(data)})}),env);
  try {
    assert.equal((await call('/api/health')).status,200);
    assert.equal((await call('/admin')).status,302);
    for (const file of ['/backend/database.sql','/config.php','/cloudflare/schema.sql']) assert.equal((await call(file)).status,404);
    assert.equal((await worker.fetch(new Request('https://site.example/admin/'),{...env,ADMIN_SESSION_SECRET:''})).status,503);
    assert.equal((await call('/admin/')).status,303);
    assert.equal((await call('/api/analytics.php?dashboard=true')).status,401);
    for(const route of ['/api/movies.php','/api/streaming-availability.php','/api/performance.php?type=feature_flags']) assert.equal((await call(route,{method:'POST',data:{}})).status,401);
    assert.equal((await call('/admin/api/analytics.php?dashboard=true',{auth:true,session:token.slice(0,-3)+'abc'})).status,401);
    const dashboard=await call('/admin/',{auth:true});assert.equal(dashboard.status,200);
    const html=await dashboard.text();assert(!html.includes('<?'));assert(html.includes(csrf));assert(!html.includes(token));assert(html.includes('data-bs-target="#changePasswordModal"'));
    assert.equal((await call('/api/movies.php',{method:'POST',auth:true,token:'wrong',data:{}})).status,403);
    assert.equal((await call('/api/movies.php',{method:'POST',auth:true,data:'{'})).status,400);
    assert.equal((await call('/api/movies.php',{method:'POST',auth:true,data:{title:'x'.repeat(33000)}})).status,413);
    assert.equal((await call('/api/check.php?tmdb_id=550',{headers:{Origin:'https://evil.example'}})).status,403);
    const movie={tmdb_id:550,title:'QA <img src=x onerror=alert(1)>',download_url:'https://example.invalid/qa.mp4',source:'QA',year:2000};
    assert.equal((await call('/api/movies.php',{method:'POST',auth:true,data:{...movie,download_url:'javascript:alert(1)'}})).status,422);
    const created=await call('/api/movies.php',{method:'POST',auth:true,data:movie});assert.equal(created.status,200,await created.clone().text());const id=(await created.json()).data.id;
    assert.equal((await call('/api/movies.php',{method:'POST',auth:true,data:movie})).status,409);
    assert((await (await call('/admin/',{auth:true})).text()).includes('&lt;img'));
    assert.equal((await call('/api/movies.php?id='+id,{method:'PUT',auth:true,data:{title:'Edited QA',tmdb_id:551}})).status,200);
    assert.equal((await (await call('/api/check.php?tmdb_id=551')).json()).data.title,'Edited QA');
    const record={tmdbId:551,title:'QA',available:true,serverIds:['vidlink'],validMinutes:15,confirmed:true};
    assert.equal((await call('/api/streaming-availability.php',{method:'POST',auth:true,data:{...record,confirmed:false}})).status,422);
    assert.equal((await call('/api/streaming-availability.php',{method:'POST',auth:true,data:record})).status,200);
    assert.equal((await (await call('/api/streaming-availability.php')).json()).movies['551'].available,true);
    for(const page_type of ['home','movie','about']) assert.equal((await call('/api/analytics.php',{method:'POST',data:{event_type:'page_view',session_id:'qa',page_type,content_id:page_type==='movie'?551:null,content_type:page_type==='movie'?'movie':null}})).status,200);
    assert.equal((await call('/api/analytics.php',{method:'POST',data:{event_type:'search',session_id:'qa',search_query:'QA',results_count:1}})).status,200);
    assert.equal((await call('/api/analytics.php',{method:'POST',data:{event_type:'provider_click',session_id:'qa',content_id:551,content_type:'tv',provider:'netflix',provider_url:'https://www.netflix.com/search?q=QA'}})).status,200);
    const stats=(await (await call('/api/analytics.php?dashboard=true',{auth:true})).json()).data;
    assert.equal(stats.page_views.total,3);assert.equal(stats.page_views.today,3);assert.equal(stats.search_queries.total,1);assert.equal(stats.provider_clicks.total,1);assert.equal(stats.engagement.total,0);
    assert.equal((await call('/api/performance.php?type=api_metric',{method:'POST',data:{endpoint:'/tmdb/search/multi',method:'GET',response_time_ms:100,status_code:200,cache_hit:false}})).status,200);
    const metrics=(await (await call('/api/performance.php?type=dashboard',{auth:true})).json()).data;
    assert.equal(metrics.api_metrics[0].requests,1);assert.equal(metrics.api_metrics[0].avg_response,100);assert.deepEqual(metrics.cache_metrics,[]);
    assert.equal((await call('/api/performance.php?type=feature_flags',{method:'PUT',auth:true,data:{feature_name:'unknown',is_enabled:true}})).status,404);
    assert.equal((await call('/api/streaming-availability.php',{method:'DELETE',auth:true,data:{tmdbId:551}})).status,200);
    assert.equal((await call('/api/movies.php?id='+id,{method:'DELETE',auth:true})).status,200);
    assert.equal((await call('/api/movies.php?id='+id)).status,404);
    assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM admin_audit WHERE action NOT LIKE 'auth.%'").get().n,5);
    console.log(JSON.stringify({cloudflareWorker:'passed with local SQLite adapter',passwordLoginAndSession:'passed',csrf:'passed',movieCrud:'passed',catalogCrud:'passed',realDatabaseAnalyticsTotals:'passed',performanceMetrics:'passed',auditLog:'passed',productionPasswordLogin:'not tested'}));
    if(process.argv.includes('--browser')) {
      const buildRoot=path.resolve(__dirname,'../build');
      env.ASSETS.fetch=async request=>{
        const pathname=decodeURIComponent(new URL(request.url).pathname);
        let file=path.resolve(buildRoot,'.'+pathname);
        if(!file.startsWith(buildRoot+path.sep)&&file!==buildRoot)return new Response('Forbidden',{status:403});
        if(!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(buildRoot,'index.html');
        const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
        const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream'};
        for(const line of fs.readFileSync(path.join(buildRoot,'_headers'),'utf8').split('\n')) {const match=line.match(/^  ([\w-]+): (.+)$/);if(match)headers[match[1]]=match[2];}
        return new Response(fs.readFileSync(file),{headers});
      };
      const { chromium }=require(path.join(require('os').tmpdir(),'moviesync-browser-tools/node_modules/playwright'));
      const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
      const http=require('http');
      const server=http.createServer(async(req,res)=>{
        try {
          const input=[];for await(const chunk of req)input.push(chunk);
          const data=Buffer.concat(input);
          const request=new Request('http://127.0.0.1:8788'+req.url,{method:req.method,headers:req.headers,...(data.length?{body:data}: {})});
          const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
        } catch(error){res.writeHead(500);res.end('Test bridge failed');console.error(error);}
      });
      await new Promise(resolve=>server.listen(8788,'127.0.0.1',resolve));
      try {
        const context=await browser.newContext();await context.addCookies([{name:'cinehub_session',value:token,url:'http://127.0.0.1:8788',httpOnly:true,sameSite:'Strict'}]);
        const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
        await page.goto('http://127.0.0.1:8788/admin/');
        await page.locator('[data-section="analytics"]').click();
        await page.waitForFunction(()=>document.getElementById('totalPageViews').textContent==='3');
        assert.equal(await page.locator('#totalProviderClicks').textContent(),'1');assert.equal(await page.locator('#totalSearches').textContent(),'1');
        await page.locator('#analyticsStatus').filter({hasText:'Last refreshed:'}).waitFor();
        await page.route('**/admin/api/analytics.php?dashboard=true',route=>route.fulfill({status:503,json:{error:'Temporary database outage'}}));
        await page.locator('[data-section="analytics"]').click();await page.locator('#totalPageViews').filter({hasText:'Unavailable'}).waitFor();
        assert.equal(await page.locator('#totalSearches').textContent(),'Unavailable');
        await page.unroute('**/admin/api/analytics.php?dashboard=true');
        await page.locator('[data-section="analytics"]').click();await page.locator('#totalPageViews').filter({hasText:'3'}).waitFor();
        await page.locator('[data-section="performance"]').click();await page.locator('#apiMetricsTable').getByText('/tmdb/search/multi').waitFor();
        await page.getByRole('link',{name:'Streaming Availability',exact:true}).click();
        await page.getByRole('heading',{name:'Streaming Availability',exact:true}).waitFor();
        await page.getByLabel('TMDB movie ID',{exact:true}).fill('552');await page.getByLabel('Movie title',{exact:true}).fill('Browser QA');await page.getByLabel('Availability',{exact:true}).selectOption('false');
        await page.getByRole('button',{name:'Save availability',exact:true}).click();await page.getByRole('button',{name:'Edit Browser QA',exact:true}).waitFor();
        page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Remove Browser QA',exact:true}).click();await page.getByRole('status').filter({hasText:'Availability record removed.'}).waitFor();
        assert.deepEqual(errors,[]);
        console.log(JSON.stringify({browserAdmin:'passed',databaseToDashboardCounts:'passed',outageClearsOldCounts:'passed',recovery:'passed',catalogEditing:'passed',authentication:'server-side session from real password login; production sign-in not tested'}));
        const visitor=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
        await visitor.route('**/api.themoviedb.org/3/**',route=>{
          const pathname=new URL(route.request().url()).pathname;
          let data={results:[],genres:[]};
          if(pathname.endsWith('/search/multi'))data={results:[{id:550,title:'Alpha film',media_type:'movie',vote_average:8},{id:1399,name:'Alpha series',media_type:'tv',vote_average:8}],page:1,total_results:2,total_pages:1};
          if(/\/tv\/1399$/.test(pathname))data={id:1399,name:'Alpha series',genres:[],vote_average:8,seasons:[{season_number:1,episode_count:1,name:'Season 1',id:1}]};
          if(pathname.endsWith('/watch/providers'))data={results:{US:{flatrate:[{provider_id:8,provider_name:'Netflix'}]}}};
          if(pathname.endsWith('/season/1'))data={episodes:[{id:1,season_number:1,episode_number:1,name:'Episode 1'}]};
          return route.fulfill({json:data});
        });
        await visitor.route('https://www.netflix.com/**',route=>route.fulfill({contentType:'text/html',body:'<p>Outbound provider fixture. No playback claimed.</p>'}));
        const site=await visitor.newPage();
        const aboutRecorded=site.waitForResponse(response=>response.url().endsWith('/api/analytics.php')&&response.request().method()==='POST');
        await site.goto('http://127.0.0.1:8788/about',{waitUntil:'domcontentloaded'});
        await site.getByRole('heading',{name:'About CineHub',exact:true}).waitFor();
        await aboutRecorded;
        assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM analytics_page_views WHERE page_type='about'").get().n,2);
        await site.getByRole('searchbox',{name:'Search',exact:true}).fill('alpha');
        await site.locator('.search-content .movie-row-card').first().waitFor();
        await site.waitForFunction(()=>!document.querySelector('.spinner-border'));
        await new Promise(async(resolve,reject)=>{for(let i=0;i<100;i++){if(db.sql.prepare("SELECT COUNT(*) n FROM analytics_search WHERE search_query='alpha'").get().n===1)return resolve();await new Promise(r=>setTimeout(r,50));}reject(Error('Search event was not recorded'));});
        const recorded=db.sql.prepare("SELECT results_count FROM analytics_search WHERE search_query='alpha'").get();assert.equal(recorded.results_count,2);
        assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM performance_api_metrics WHERE endpoint='/tmdb/search/multi'").get().n,2);
        await site.goto('http://127.0.0.1:8788/tv/1399',{waitUntil:'domcontentloaded'});
        await site.getByRole('button',{name:/Where to Watch/}).click();
        const clickRecorded=visitor.waitForEvent('response',{predicate:response=>response.url().endsWith('/api/analytics.php')&&response.request().postDataJSON()?.event_type==='provider_click'});
        const popupOpened=site.waitForEvent('popup');
        await site.getByRole('link',{name:'Find on Netflix',exact:true}).click();
        const popup=await popupOpened;
        await Promise.all([popup.waitForURL('https://www.netflix.com/**'),clickRecorded]);
        assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM analytics_provider_clicks WHERE content_id=1399 AND content_type='tv'").get().n,1);
        await visitor.close();
        console.log(JSON.stringify({productionFrontendToDatabase:'passed',routeVisits:'passed',searchCountAndResultTotal:'passed',searchRequestMetrics:'passed',tvProviderClickIdentity:'passed',data:'isolated SQLite fixture only'}));
      } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
    }
  } finally {global.fetch=originalFetch;db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
