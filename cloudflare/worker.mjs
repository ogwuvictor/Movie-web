import { dashboard, streaming, streamingScript, usersScript } from './generated/admin.mjs';
import { HttpError, authConfig, authorize, checkCsrf, setCookie } from './auth.mjs';
import { api, json, limit, httpUrl } from './api.mjs';
import { signIn, signOut, changePassword } from './login.mjs';
import { visitors } from './visitors.mjs';
import { adminUserStatistics } from './user-stats.mjs';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const safeUrl = value => { try { return httpUrl(value); } catch { return '#'; } };
function movieRows(movies) {
  if(!movies.length)return '<tr><td colspan="8" class="text-center py-4"><i class="fas fa-inbox fa-2x mb-3"></i><p>No public domain movies found.</p><button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#movieModal">Add First Movie</button></td></tr>';
  return movies.map(movie=>`<tr><td>${escape(movie.id)}</td><td><a href="https://www.themoviedb.org/movie/${escape(movie.tmdb_id)}" target="_blank" rel="noopener noreferrer">${escape(movie.tmdb_id)}</a></td><td>${escape(movie.title)}</td><td>${escape(movie.year??'N/A')}</td><td>${escape(movie.source)}</td><td><a href="${escape(safeUrl(movie.download_url))}" target="_blank" rel="noopener noreferrer" class="text-decoration-none text-truncate d-block" style="max-width:200px">${escape(String(movie.download_url).slice(0,30))}...</a></td><td>${escape(movie.created_at)} UTC</td><td><button class="btn btn-sm btn-outline-primary me-1" data-edit-movie="${escape(movie.id)}"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-outline-danger" data-delete-movie="${escape(movie.id)}"><i class="fas fa-trash"></i></button></td></tr>`).join('');
}
function secure(response, nonce, url) {
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  headers.set('Cache-Control','no-store');
  if(url.protocol==='https:')headers.set('Strict-Transport-Security','max-age=31536000');
  headers.set('Content-Security-Policy',nonce ? `default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'nonce-${nonce}'; style-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 'unsafe-inline'; font-src 'self' https://cdnjs.cloudflare.com data:; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` : "default-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  return new Response(response.body,{status:response.status,headers});
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url); let nonce;
    try {
      const isBackend=url.pathname==='/api'||url.pathname.startsWith('/api/')||url.pathname==='/admin'||url.pathname.startsWith('/admin/');
      if (/^\/(?:backend|cloudflare|scripts|\.git)(?:\/|$)/.test(url.pathname) || ['/config.php','/security.php','/database.sql'].includes(url.pathname)) throw new HttpError(404,'Not found.');
      if(!isBackend)return env.ASSETS.fetch(request);
      if(url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new HttpError(403,'HTTPS is required.');
      if (request.headers.get('Sec-Fetch-Site') === 'cross-site' && !['GET','HEAD'].includes(request.method)) throw new HttpError(403,'Origin not allowed.');
      const origin=request.headers.get('Origin');
      if(origin&&origin!==url.origin)throw new HttpError(403,'Origin not allowed.');
      if(url.pathname==='/admin'&&request.method==='GET')return secure(new Response(null,{status:302,headers:{Location:'/admin/'}}),null,url);
      if(!env.DB)throw new HttpError(503,'Database binding is not configured.');
      // First read goes to the primary. No stale replica/cache is used for admin reports.
      const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
      if(url.pathname==='/admin/api/users.php') return secure(await adminUserStatistics(request,env,db),null,url);
      if(url.pathname.startsWith('/api/community/')) return secure(await visitors(request,env,db,url),null,url);
      if(url.pathname==='/api/health'&&request.method==='GET') {
        authConfig(env);
        const required=['public_domain_movies','analytics_page_views','analytics_provider_clicks','analytics_search','analytics_engagement','performance_api_metrics','performance_system_metrics','optimization_ab_tests','optimization_feature_flags','optimization_cache_metrics','streaming_catalog','request_limits','admin_audit','admin_users','admin_sessions','visitors','visitor_sessions','visitor_library','visitor_reviews','visitor_daily_activity','visitor_activity_settings','anonymous_daily_activity','anonymous_activity_settings'];
        const schema=await db.prepare(`SELECT COUNT(*) count FROM sqlite_master WHERE type='table' AND name IN (${required.map(()=>'?').join(',')})`).bind(...required).first();
        if(schema.count!==required.length)throw new HttpError(503,'The D1 schema is incomplete.');
        if (!(await db.prepare('SELECT COUNT(*) count FROM admin_users WHERE disabled=0').first()).count) throw new HttpError(503,'Create the admin account before signing in.');
        return secure(json({status:'configured',authentication:'password',checkedAt:new Date().toISOString(),liveSignIn:'requires a deployed browser sign-in test'}),null,url);
      }
      if (url.pathname === '/admin/login.php') {
        nonce=crypto.randomUUID().replaceAll('-','');
        return secure(await signIn(request,env,db,nonce),nonce,url);
      }
      if (url.pathname === '/admin/logout.php') return secure(await signOut(request,env,db),null,url);
      if (url.pathname === '/admin/change_password.php') return secure(await changePassword(request,env,db),null,url);
      if(url.pathname.startsWith('/admin/api/')) {
        // Private reports and mutations require a server-side session.
        const identity=await authorize(request,env,db);
        if(!['GET','HEAD'].includes(request.method))checkCsrf(request,identity);
        const endpoint=new URL(url);endpoint.pathname=endpoint.pathname.replace('/admin/api/','/api/');
        return secure(await api(request,env,db,endpoint),null,url);
      }
      if(url.pathname.startsWith('/api/')) {
        const publicRead=request.method==='GET'&&['/api/movies.php','/api/check.php','/api/streaming-availability.php'].includes(url.pathname);
        const publicWrite=request.method==='POST'&&(url.pathname==='/api/analytics.php'||(url.pathname==='/api/performance.php'&&url.searchParams.get('type')==='api_metric'));
        if(!publicRead&&!publicWrite)throw new HttpError(401,'Use the protected admin API after signing in.');
        return secure(await api(request,env,db,url),null,url);
      }
      await limit(db,request,'admin-pages',120);
      const identity=await authorize(request,env,db);
      if(request.method!=='GET')throw new HttpError(405,'Method not allowed.');
      if(url.pathname==='/admin/streaming.js')return secure(new Response(streamingScript,{headers:{'Content-Type':'application/javascript; charset=utf-8'}}),null,url);
      if(url.pathname==='/admin/users.js')return secure(new Response(usersScript,{headers:{'Content-Type':'application/javascript; charset=utf-8'}}),null,url);
      if(!['/admin','/admin/','/admin/index.php','/admin/login.php','/admin/streaming.php'].includes(url.pathname))throw new HttpError(404,'Admin page not found.');
      if(url.pathname==='/admin'||url.pathname==='/admin/login.php')return secure(new Response(null,{status:302,headers:{Location:'/admin/'}}),null,url);
      nonce=crypto.randomUUID().replaceAll('-','');
      const isCatalog=url.pathname==='/admin/streaming.php';
      const movies=isCatalog?[]:(await db.prepare('SELECT * FROM public_domain_movies ORDER BY year DESC,title ASC').all()).results;
      const values={__CSRF__:escape(identity.csrf),__NONCE__:escape(nonce),__MOVIE_ROWS__:movieRows(movies)};
      const html=(isCatalog?streaming:dashboard).replace(/__CSRF__|__NONCE__|__MOVIE_ROWS__/g,marker=>values[marker]);
      return secure(new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}),nonce,url);
    } catch(error) {
      if (error instanceof HttpError && error.status === 401 && request.method === 'GET' && ['/admin/','/admin/index.php','/admin/streaming.php'].includes(url.pathname)) return secure(new Response(null,{status:303,headers:{Location:'/admin/login.php','Set-Cookie':setCookie(request,'',0)}}),null,url);
      const status=error instanceof HttpError?error.status:/UNIQUE constraint failed/.test(error.message)?409:503;
      if(status===503)console.error('Cloudflare backend request failed:',error.message);
      return secure(json({error:error instanceof HttpError?error.message:status===409?'A record with this identifier already exists.':'Service unavailable. Try again later.'},status),nonce,url);
    }
  }
};
