import { dashboard, streaming, streamingScript } from './generated/admin.mjs';
import { HttpError, accessConfig, authorize, checkCsrf } from './auth.mjs';
import { api, json, limit, httpUrl } from './api.mjs';
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
      const origin=request.headers.get('Origin');
      if(origin&&origin!==url.origin)throw new HttpError(403,'Origin not allowed.');
      if(url.pathname==='/admin'&&request.method==='GET')return secure(new Response(null,{status:302,headers:{Location:'/admin/'}}),null,url);
      if(!env.DB)throw new HttpError(503,'Database binding is not configured.');
      // First read goes to the primary. No stale replica/cache is used for admin reports.
      const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
      if(url.pathname==='/api/health'&&request.method==='GET') {
        accessConfig(env);
        const required=['public_domain_movies','analytics_page_views','analytics_provider_clicks','analytics_search','analytics_engagement','performance_api_metrics','performance_system_metrics','optimization_ab_tests','optimization_feature_flags','optimization_cache_metrics','streaming_catalog','request_limits','admin_audit'];
        const schema=await db.prepare(`SELECT COUNT(*) count FROM sqlite_master WHERE type='table' AND name IN (${required.map(()=>'?').join(',')})`).bind(...required).first();
        if(schema.count!==required.length)throw new HttpError(503,'The D1 schema is incomplete.');
        return secure(json({status:'configured',checkedAt:new Date().toISOString(),liveAccessLogin:'requires a deployed browser sign-in test'}),null,url);
      }
      if(url.pathname.startsWith('/admin/api/')) {
        // Access must protect /admin/* at the edge, including all private API routes.
        const identity=await authorize(request,env);
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
      const identity=await authorize(request,env);
      if(url.pathname==='/admin/logout.php') {
        if(request.method!=='POST')throw new HttpError(405,'Method not allowed.');
        if(Number(request.headers.get('Content-Length'))>32768)throw new HttpError(413,'Request too large.');
        const form=new URLSearchParams(await request.text());checkCsrf(request,identity,form.get('csrf_token'));
        const cookie=`CF_Authorization=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${url.protocol==='https:'?'; Secure':''}`;
        return secure(new Response(null,{status:303,headers:{Location:'/cdn-cgi/access/logout','Set-Cookie':cookie}}),null,url);
      }
      if(request.method!=='GET')throw new HttpError(405,'Method not allowed. Sign-in is managed by Cloudflare Access.');
      if(url.pathname==='/admin/streaming.js')return secure(new Response(streamingScript,{headers:{'Content-Type':'application/javascript; charset=utf-8'}}),null,url);
      if(!['/admin','/admin/','/admin/index.php','/admin/login.php','/admin/streaming.php'].includes(url.pathname))throw new HttpError(404,'Admin page not found.');
      if(url.pathname==='/admin'||url.pathname==='/admin/login.php')return secure(new Response(null,{status:302,headers:{Location:'/admin/'}}),null,url);
      nonce=crypto.randomUUID().replaceAll('-','');
      const isCatalog=url.pathname==='/admin/streaming.php';
      const movies=isCatalog?[]:(await db.prepare('SELECT * FROM public_domain_movies ORDER BY year DESC,title ASC').all()).results;
      const values={__CSRF__:escape(identity.csrf),__NONCE__:escape(nonce),__MOVIE_ROWS__:movieRows(movies)};
      const html=(isCatalog?streaming:dashboard).replace(/__CSRF__|__NONCE__|__MOVIE_ROWS__/g,marker=>values[marker]);
      return secure(new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}),nonce,url);
    } catch(error) {
      const status=error instanceof HttpError?error.status:/UNIQUE constraint failed/.test(error.message)?409:503;
      if(status===503)console.error('Cloudflare backend request failed:',error.message);
      return secure(json({error:error instanceof HttpError?error.message:status===409?'A record with this identifier already exists.':'Service unavailable. Try again later.'},status),nonce,url);
    }
  }
};
