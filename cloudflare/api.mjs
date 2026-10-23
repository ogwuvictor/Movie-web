import { HttpError, authorize, checkCsrf, hash } from './auth.mjs';
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const success = (data = null, message = 'Success') => json({ success: true, data, message, generatedAt: new Date().toISOString(), timezone: 'UTC' });
export const positiveId = value => {
  if (!/^[1-9]\d{0,15}$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new HttpError(422, 'Invalid ID.');
  return Number(value);
};
const text = (value, max, required = true) => {
  if ((value == null || value === '') && !required) return null;
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(422, 'Invalid or overlong text field.');
  return value.trim();
};
export const httpUrl = value => {
  try { const url = new URL(value); if (typeof value !== 'string' || value.length > 2048 || url.protocol !== 'https:' || url.username || url.password) throw Error(); return url.href; }
  catch { throw new HttpError(422, 'Use a valid HTTPS URL.'); }
};
const number = (value, max = 2147483647, integer = true) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) throw new HttpError(422, 'Invalid numeric field.');
  return value;
};
const oneOf = (value, allowed) => { if (!allowed.includes(value)) throw new HttpError(422, 'Invalid field value.'); return value; };
export async function body(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) throw new HttpError(415, 'Send application/json.');
  if (Number(request.headers.get('Content-Length')) > 32768) throw new HttpError(413, 'Request too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A JSON object is required.');
  let size = 0; const chunks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 32768) { await reader.cancel(); throw new HttpError(413, 'Request too large.'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let input; try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'Invalid JSON.'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'A JSON object is required.');
  return input;
}
export async function limit(db, request, scope, max = 120, seconds = 60) {
  const key = await hash(scope + ':' + (request.headers.get('CF-Connecting-IP') || 'unknown'));
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(`INSERT INTO request_limits(key,count,expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
    expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count`).bind(key, now + seconds, now, now).first();
  if (!row || row.count > max) throw new HttpError(429, 'Too many requests. Try again later.');
  // Bound expired rows without an extra write for every visitor event.
  if (Math.random() < 0.01) await db.prepare('DELETE FROM request_limits WHERE expires_at < ?').bind(now).run();
}
async function admin(request, env, db, mutation = false) {
  await limit(db, request, 'admin', 120);
  const identity = await authorize(request, env);
  if (mutation) checkCsrf(request, identity);
  return identity;
}
const rows = async (db, sql, values = []) => (await db.prepare(sql).bind(...values).all()).results;
async function mutate(db, statement, identity, action, entity) {
  const result = await db.batch([statement, db.prepare('INSERT INTO admin_audit(actor,action,entity) SELECT ?,?,? WHERE changes()>0').bind(identity.email, action, String(entity))]);
  return result[0];
}
async function movies(request, env, db, url) {
  const method = request.method;
  if (method === 'GET') {
    if (url.searchParams.has('id') || url.searchParams.has('tmdb_id')) {
      const key = url.searchParams.has('id') ? 'id' : 'tmdb_id';
      const value = await db.prepare(`SELECT * FROM public_domain_movies WHERE ${key}=?`).bind(positiveId(url.searchParams.get(key))).first();
      if (!value && key === 'id') throw new HttpError(404, 'Movie not found.');
      return success(value);
    }
    return success(await rows(db, 'SELECT * FROM public_domain_movies ORDER BY year DESC,title ASC'));
  }
  if (!['POST','PUT','DELETE'].includes(method)) throw new HttpError(405, 'Method not allowed.');
  const identity = await admin(request, env, db, true);
  const id = method !== 'POST' ? positiveId(url.searchParams.get('id')) : null;
  if (method === 'DELETE') {
    const existing = await db.prepare('SELECT id FROM public_domain_movies WHERE id=?').bind(id).first();
    if (!existing) throw new HttpError(404, 'Movie not found.');
    const result = await mutate(db, db.prepare('DELETE FROM public_domain_movies WHERE id=?').bind(id), identity, 'movie.delete', id);
    if (!result.meta.changes) throw new HttpError(404, 'Movie not found.');
    return success(null, 'Movie deleted successfully');
  }
  const input = await body(request); const fields = {};
  if (method === 'POST' || 'tmdb_id' in input) fields.tmdb_id = positiveId(input.tmdb_id);
  if (method === 'POST' || 'title' in input) fields.title = text(input.title,255);
  if (method === 'POST' || 'download_url' in input) fields.download_url = httpUrl(input.download_url);
  if (method === 'POST' || 'source' in input) fields.source = text(input.source ?? 'Unknown',100);
  if ('year' in input) { fields.year = input.year === null ? null : number(input.year,new Date().getUTCFullYear()+10); if (fields.year !== null && fields.year < 1888) throw new HttpError(422,'Invalid year.'); }
  if (method === 'POST') {
    const keys = Object.keys(fields);
    const result = await mutate(db, db.prepare(`INSERT INTO public_domain_movies(${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...Object.values(fields)), identity, 'movie.create', fields.tmdb_id);
    return success({ id: result.meta.last_row_id }, 'Movie added successfully');
  }
  if (!Object.keys(fields).length) throw new HttpError(422,'No fields to update.');
  if (!await db.prepare('SELECT id FROM public_domain_movies WHERE id=?').bind(id).first()) throw new HttpError(404,'Movie not found.');
  await mutate(db, db.prepare(`UPDATE public_domain_movies SET ${Object.keys(fields).map(key=>`${key}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...Object.values(fields),id), identity, 'movie.update', id);
  return success(null,'Movie updated successfully');
}
async function catalog(request, env, db) {
  if (request.method === 'GET') {
    const records = await rows(db,'SELECT tmdb_id,record FROM streaming_catalog');
    return json({ movies: Object.fromEntries(records.map(row=>[row.tmdb_id,JSON.parse(row.record)])), generatedAt:new Date().toISOString() });
  }
  if (!['POST','DELETE'].includes(request.method)) throw new HttpError(405,'Method not allowed.');
  const identity = await admin(request,env,db,true); const input = await body(request); const id=String(positiveId(input.tmdbId));
  if (request.method === 'DELETE') {
    await mutate(db,db.prepare('DELETE FROM streaming_catalog WHERE tmdb_id=?').bind(id),identity,'catalog.delete',id);
    return json({success:true,message:'Availability record removed.'});
  }
  const title=text(input.title,240);
  if (typeof input.available !== 'boolean' || !Array.isArray(input.serverIds) || input.serverIds.length>4) throw new HttpError(422,'Invalid availability record.');
  const serverIds=[...new Set(input.serverIds.map(id=>oneOf(id,['vidlink','videasy','vidfast','movies111'])))];
  const minutes=number(input.validMinutes,1440); if(minutes<1) throw new HttpError(422,'Confirmation must expire within 1 to 1440 minutes.');
  if(input.available && (!serverIds.length || input.confirmed!==true)) throw new HttpError(422,'Confirm playback on the selected servers before marking the title available.');
  const record={title,available:input.available,serverIds,checkedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+minutes*60000).toISOString()};
  await mutate(db,db.prepare('INSERT INTO streaming_catalog(tmdb_id,record) VALUES (?,?) ON CONFLICT(tmdb_id) DO UPDATE SET record=excluded.record').bind(id,JSON.stringify(record)),identity,'catalog.update',id);
  return json({success:true,message:'Availability record saved.'});
}
async function analytics(request,env,db,url) {
  if(request.method==='POST') {
    await limit(db,request,'analytics'); const input=await body(request);
    const session_id=text(input.session_id,100); const content_id=input.content_id==null?null:positiveId(input.content_id);
    const content_type=input.content_type==null?null:oneOf(input.content_type,['movie','tv']);
    const common={session_id,user_agent:text(input.user_agent,255,false),ip_address:null};
    let table,record;
    switch(input.event_type) {
      case 'page_view': table='analytics_page_views'; record={...common,content_id,content_type,page_type:oneOf(input.page_type,['home','about','genre','movie','tv','search','trailer']),referrer:text(input.referrer,255,false),device_type:oneOf(input.device_type||'other',['desktop','tablet','mobile','other']),screen_resolution:text(input.screen_resolution,20,false),country_code:request.cf?.country||null}; break;
      case 'provider_click': if(!content_id||!content_type)throw new HttpError(422,'Content identity required.'); table='analytics_provider_clicks'; record={...common,content_id,content_type,content_title:text(input.content_title,255,false),provider:text(input.provider,50),provider_url:httpUrl(input.provider_url)}; break;
      case 'search': table='analytics_search'; record={...common,search_query:text(input.search_query,255),results_count:number(input.results_count??0)}; break;
      case 'engagement': if(!content_id||!content_type)throw new HttpError(422,'Content identity required.'); table='analytics_engagement'; record={...common,content_id,content_type,action_type:oneOf(input.action_type,['like','add_to_list','share','trailer_play','details_view']),action_value:text(input.action_value,255,false)}; break;
      // Actual video playback is not inferred from an iframe load or Watch click.
      default: throw new HttpError(422,'Unsupported event type.');
    }
    const keys=Object.keys(record); await db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...Object.values(record)).run();
    return success(null,'Analytics event recorded');
  }
  if(request.method!=='GET')throw new HttpError(405,'Method not allowed.');
  await admin(request,env,db);
  const queries=[
    'SELECT COUNT(*) count FROM analytics_page_views',
    'SELECT page_type,COUNT(*) count FROM analytics_page_views GROUP BY page_type',
    "SELECT COUNT(*) count FROM analytics_page_views WHERE created_at>=date('now')",
    'SELECT COUNT(*) count FROM analytics_provider_clicks',
    'SELECT provider,COUNT(*) count FROM analytics_provider_clicks GROUP BY provider',
    'SELECT COUNT(*) count FROM analytics_search',
    'SELECT search_query,COUNT(*) count FROM analytics_search GROUP BY search_query ORDER BY count DESC LIMIT 10',
    'SELECT COUNT(*) count FROM analytics_engagement',
    'SELECT action_type,COUNT(*) count FROM analytics_engagement GROUP BY action_type',
    'SELECT content_id,content_type,COUNT(*) views FROM analytics_page_views WHERE content_id IS NOT NULL GROUP BY content_id,content_type ORDER BY views DESC LIMIT 10',
    'SELECT country_code,COUNT(*) count FROM analytics_page_views WHERE country_code IS NOT NULL GROUP BY country_code ORDER BY count DESC LIMIT 10'
  ];
  const result=(await db.batch(queries.map(sql=>db.prepare(sql)))).map(result=>result.results);
  const data={page_views:{total:result[0][0].count,today:result[2][0].count,by_page_type:result[1]},provider_clicks:{total:result[3][0].count,by_provider:result[4]},search_queries:{total:result[5][0].count,top_queries:result[6]},engagement:{total:result[7][0].count,by_action:result[8]},top_content:result[9],geographic:result[10]};
  const type=url.searchParams.get('type');
  if(url.searchParams.get('dashboard')==='true')return success(data);
  const mapped={page_views:'page_views',provider_clicks:'provider_clicks',search:'search_queries',engagement:'engagement'};
  if(!mapped[type])throw new HttpError(422,'Specify a valid analytics type.');
  return success(data[mapped[type]]);
}
async function performance(request,env,db,url) {
  const type=url.searchParams.get('type');
  if(request.method==='POST' && type==='api_metric') {
    await limit(db,request,'performance'); const data=await body(request);
    const endpoint=text(data.endpoint,255); const method=oneOf(data.method,['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS']);
    const time=Math.round(number(data.response_time_ms,3600000,false)); const status=number(data.status_code,599); if(status<100||typeof data.cache_hit!=='boolean')throw new HttpError(422,'Invalid request metric.');
    await db.prepare('INSERT INTO performance_api_metrics(endpoint,method,response_time_ms,status_code,cache_hit,error_message) VALUES (?,?,?,?,?,?)').bind(endpoint,method,time,status,data.cache_hit?1:0,text(data.error_message,2048,false)).run();
    return success(null,'API metric tracked');
  }
  const identity=await admin(request,env,db,request.method!=='GET');
  if(request.method==='PUT' && type==='feature_flags') {
    const data=await body(request); const name=text(data.feature_name,64);
    if(!/^[a-zA-Z0-9_-]+$/.test(name))throw new HttpError(422,'Invalid feature name.');
    const fields={}; if('is_enabled'in data){if(typeof data.is_enabled!=='boolean')throw new HttpError(422,'Invalid enabled flag.');fields.is_enabled=data.is_enabled?1:0;}
    if('description'in data)fields.description=text(data.description,2048,false);
    if('rollout_percentage'in data)fields.rollout_percentage=number(data.rollout_percentage,100);
    if(!Object.keys(fields).length)throw new HttpError(422,'No fields to update.');
    if(!await db.prepare('SELECT id FROM optimization_feature_flags WHERE feature_name=?').bind(name).first())throw new HttpError(404,'Feature flag not found.');
    await mutate(db,db.prepare(`UPDATE optimization_feature_flags SET ${Object.keys(fields).map(key=>`${key}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE feature_name=?`).bind(...Object.values(fields),name),identity,'flag.update',name);
    return success(null,'Stored feature flag updated');
  }
  if(request.method!=='GET')throw new HttpError(405,'This metric has no active collector.');
  const queries={
    api_metrics:"SELECT endpoint,method,AVG(response_time_ms) avg_response,COUNT(*) requests,SUM(CASE WHEN status_code>=400 THEN 1 ELSE 0 END) errors,AVG(cache_hit)*100 cache_hit_rate FROM performance_api_metrics WHERE created_at>=datetime('now','-1 hour') GROUP BY endpoint,method ORDER BY avg_response DESC LIMIT 20",
    system_metrics:"SELECT * FROM performance_system_metrics WHERE created_at>=datetime('now','-1 hour') ORDER BY created_at DESC LIMIT 50",
    cache_metrics:'SELECT cache_key,cache_type,hit_count,miss_count,100.0*hit_count/NULLIF(hit_count+miss_count,0) hit_rate,size_bytes,ttl_seconds,updated_at FROM optimization_cache_metrics ORDER BY hit_count DESC LIMIT 50',
    feature_flags:'SELECT * FROM optimization_feature_flags ORDER BY feature_name',
    ab_tests:"SELECT test_name,variant,metric_name,AVG(metric_value) avg_value,SUM(sample_size) total_samples FROM optimization_ab_tests WHERE created_at>=datetime('now','-7 days') GROUP BY test_name,variant,metric_name"
  };
  if(type==='dashboard') {const names=['api_metrics','system_metrics','cache_metrics','feature_flags'];const results=await db.batch(names.map(name=>db.prepare(queries[name])));return success(Object.fromEntries(names.map((name,i)=>[name,results[i].results])));}
  if(!queries[type]||!Object.hasOwn(queries,type))throw new HttpError(422,'Invalid metric type.');
  return success(await rows(db,queries[type]));
}
export async function api(request,env,db,url) {
  const path=url.pathname;
  if(path==='/api/movies.php')return movies(request,env,db,url);
  if(path==='/api/check.php' && request.method==='GET') {
    const movie=await db.prepare('SELECT * FROM public_domain_movies WHERE tmdb_id=?').bind(positiveId(url.searchParams.get('tmdb_id'))).first();
    return json({success:true,is_public_domain:!!movie,data:movie});
  }
  if(path==='/api/streaming-availability.php')return catalog(request,env,db);
  if(path==='/api/analytics.php')return analytics(request,env,db,url);
  if(path==='/api/performance.php')return performance(request,env,db,url);
  throw new HttpError(404,'API endpoint not found.');
}
