import { HttpError, authConfig, mac, randomToken, cookieValue, setCookie, equal } from './auth.mjs';
import { hashPassword, verifyPassword } from './passwords.mjs';
import { body, json, limit, positiveId } from './api.mjs';
import { recordVisitorActivity } from './user-stats.mjs';
import { anonymousActivity } from './anonymous-activity.mjs';

const profile = user => ({ id: user.id, username: user.username, email: user.email });
const now = () => Math.floor(Date.now() / 1000);
const text = (value, max, allowEmpty = false) => {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) throw new HttpError(422, 'Invalid text field.');
  return value.trim();
};
const media = value => { if (!['movie','tv'].includes(value)) throw new HttpError(422,'Invalid media type.'); return value; };
export const COMMUNITY_REVIEWS_ENABLED = false;
async function identity(request, env, db) {
  const token = cookieValue(request, 'visitor');
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401,'Sign in to continue.');
  const digest = await mac(env,'visitor-session:'+token);
  const user = await db.prepare(`SELECT v.id,v.username,v.email,s.last_seen FROM visitors v JOIN visitor_sessions s ON v.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>? AND s.last_seen>?`).bind(digest,now(),now()-1800).first();
  if (!user) throw new HttpError(401,'Your session expired. Sign in again.');
  if (user.last_seen < now()-60) await db.prepare('UPDATE visitor_sessions SET last_seen=? WHERE token_hash=?').bind(now(),digest).run();
  await recordVisitorActivity(db,user.id);
  return { ...user, digest, csrf: await mac(env,'visitor-csrf:'+token) };
}
async function bootstrap(request, env) {
  const existing=cookieValue(request,'visitor_login');
  if(existing) {
    try { await loginCsrf(request,env,existing); return json({user:null,csrf:existing}); }
    catch(error) { if(error.status!==403)throw error; }
  }
  const value=randomToken()+'.'+(now()+900);
  const csrf=value+'.'+await mac(env,'visitor-login:'+new URL(request.url).origin+':'+value);
  const response=json({user:null,csrf});
  response.headers.set('Set-Cookie',setCookie(request,csrf,900,'visitor_login'));
  return response;
}
async function loginCsrf(request,env,token=request.headers.get('X-CSRF-Token') || '') {
  const parts=token.split('.');
  if(parts.length!==3 || !/^[a-f0-9]{64}$/.test(parts[0]) || !/^\d{10}$/.test(parts[1]) || Number(parts[1])<now() || Number(parts[1])>now()+900 ||
    !equal(token,cookieValue(request,'visitor_login')) || !equal(parts[2],await mac(env,'visitor-login:'+new URL(request.url).origin+':'+parts[0]+'.'+parts[1]))) throw new HttpError(403,'Reload the account page and try again.');
}
export async function visitors(request,env,db,url) {
  authConfig(env);
  const route=url.pathname.slice('/api/community/'.length), method=request.method;
  await limit(db,request,'community',120);
  if(route==='reviews' && !COMMUNITY_REVIEWS_ENABLED) throw new HttpError(404,'Community reviews and ratings are currently disabled.');
  if(route==='activity' && method==='GET') {
    try { await identity(request,env,db); return json({authenticated:true}); }
    catch(error) { if(error.status!==401)throw error; return anonymousActivity(request,env,db); }
  }
  if(route==='session' && method==='GET') {
    try { const user=await identity(request,env,db); return json({user:profile(user),csrf:user.csrf}); }
    catch(error) { if(error.status!==401) throw error; return bootstrap(request,env); }
  }
  if(['register','login'].includes(route) && method==='POST') {
    await loginCsrf(request,env);
    await limit(db,request,'visitor-auth',10,900);
    const input=await body(request);
    const email=text(input.email,254).toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(422,'Enter a valid email address.');
    const accountRequest=new Request(request.url,{headers:{'CF-Connecting-IP':email}});
    await limit(db,accountRequest,'visitor-auth-account',30,900);
    let user;
    if(route==='register') {
      const username=text(input.username,32);
      if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}$/.test(username)) throw new HttpError(422,'Use 3–32 letters, numbers, dots, underscores or hyphens for your username.');
      const record=await hashPassword(input.password);
      try { await db.prepare('INSERT INTO visitors(username,email,password_hash) VALUES (?,?,?)').bind(username,email,record).run(); }
      catch(error) { if(/UNIQUE constraint/.test(error.message)) throw new HttpError(409,'That email or username is already registered.'); throw error; }
      user=await db.prepare('SELECT id,username,email FROM visitors WHERE email=?').bind(email).first();
    } else {
      if(typeof input.password!=='string' || new TextEncoder().encode(input.password).length>128) throw new HttpError(401,'Invalid email or password.');
      user=await db.prepare('SELECT id,username,email,password_hash FROM visitors WHERE email=?').bind(email).first();
      const valid=await verifyPassword(input.password,user?.password_hash);
      if(!user || !valid) throw new HttpError(401,'Invalid email or password.');
    }
    const token=randomToken(), digest=await mac(env,'visitor-session:'+token);
    const old=await mac(env,'visitor-session:'+cookieValue(request,'visitor'));
    await db.batch([
      db.prepare('DELETE FROM visitor_sessions WHERE token_hash=? OR expires_at<=? OR last_seen<=?').bind(old,now(),now()-1800),
      db.prepare('INSERT INTO visitor_sessions(token_hash,user_id,last_seen,expires_at) VALUES (?,?,?,?)').bind(digest,user.id,now(),now()+28800),
      db.prepare('DELETE FROM visitor_sessions WHERE user_id=? AND token_hash NOT IN (SELECT token_hash FROM visitor_sessions WHERE user_id=? ORDER BY rowid DESC LIMIT 5)').bind(user.id,user.id),
    ]);
    await recordVisitorActivity(db,user.id);
    const response=json({user:profile(user),csrf:await mac(env,'visitor-csrf:'+token)});
    response.headers.set('Set-Cookie',setCookie(request,token,28800,'visitor'));
    return response;
  }
  if(route==='reviews' && method==='GET') {
    const type=media(url.searchParams.get('type')), id=positiveId(url.searchParams.get('id'));
    const page=positiveId(url.searchParams.get('page') || 1); if(page>10000) throw new HttpError(422,'Invalid page.');
    const summary=await db.prepare('SELECT COUNT(*) AS count,AVG(rating) AS average FROM visitor_reviews WHERE media_type=? AND tmdb_id=?').bind(type,id).first();
    const reviews=(await db.prepare(`SELECT v.username,r.rating,r.review,r.updated_at FROM visitor_reviews r JOIN visitors v ON v.id=r.user_id
      WHERE r.media_type=? AND r.tmdb_id=? ORDER BY r.updated_at DESC,r.user_id DESC LIMIT 20 OFFSET ?`).bind(type,id,(page-1)*20).all()).results;
    return json({summary,reviews,page,hasMore:page*20<summary.count});
  }
  const user=await identity(request,env,db);
  if(method!=='GET' && !equal(request.headers.get('X-CSRF-Token'),user.csrf)) throw new HttpError(403,'Reload the page and try again.');
  if(route==='logout' && method==='POST') {
    await db.prepare('DELETE FROM visitor_sessions WHERE token_hash=?').bind(user.digest).run();
    const response=json({success:true}); response.headers.set('Set-Cookie',setCookie(request,'',0,'visitor')); return response;
  }
  if(route==='library' && method==='GET') {
    const page=positiveId(url.searchParams.get('page') || 1); if(page>10000) throw new HttpError(422,'Invalid page.');
    const list=url.searchParams.get('list'),type=url.searchParams.get('type');
    if(list && !['favorite','watchlist'].includes(list))throw new HttpError(422,'Invalid list.');
    if(type)media(type);
    const where=['user_id=?'],values=[user.id];
    if(list){where.push('list=?');values.push(list);}if(type){where.push('media_type=?');values.push(type);}
    const results=await db.batch([
      db.prepare('SELECT media_type,tmdb_id,list,title,poster_path FROM visitor_library WHERE '+where.join(' AND ')+' ORDER BY created_at DESC,media_type,tmdb_id DESC,list LIMIT 51 OFFSET ?').bind(...values,(page-1)*50),
      db.prepare('SELECT list,COUNT(*) AS count FROM visitor_library WHERE user_id=? GROUP BY list').bind(user.id),
      db.prepare('SELECT COUNT(*) AS count FROM visitor_library WHERE '+where.join(' AND ')).bind(...values),
    ]);
    const items=results[0].results,counts={favorite:0,watchlist:0};for(const row of results[1].results)counts[row.list]=row.count;
    return json({items:items.slice(0,50),hasMore:items.length>50,page,counts,total:results[2].results[0].count});
  }
  if(route==='title' && method==='GET') {
    const type=media(url.searchParams.get('type')),id=positiveId(url.searchParams.get('id'));
    const lists=(await db.prepare('SELECT list FROM visitor_library WHERE user_id=? AND media_type=? AND tmdb_id=?').bind(user.id,type,id).all()).results.map(row=>row.list);
    return json({lists});
  }
  if(['library','reviews'].includes(route) && ['PUT','DELETE'].includes(method)) {
    await limit(db,request,'community-writes',30);
    const input=await body(request),type=media(input.type),id=positiveId(input.id);
    if(route==='library') {
      if(!['favorite','watchlist'].includes(input.list)) throw new HttpError(422,'Invalid list.');
      if(method==='DELETE') await db.prepare('DELETE FROM visitor_library WHERE user_id=? AND media_type=? AND tmdb_id=? AND list=?').bind(user.id,type,id,input.list).run();
      else {
        const title=text(input.title,255),poster=input.poster_path || null;
        if(poster!==null && (typeof poster!=='string' || !/^\/[a-zA-Z0-9_.-]{1,200}$/.test(poster))) throw new HttpError(422,'Invalid poster path.');
        await db.prepare(`INSERT INTO visitor_library(user_id,media_type,tmdb_id,list,title,poster_path) VALUES (?,?,?,?,?,?)
          ON CONFLICT(user_id,media_type,tmdb_id,list) DO UPDATE SET title=excluded.title,poster_path=excluded.poster_path`).bind(user.id,type,id,input.list,title,poster).run();
      }
    } else if(method==='DELETE') await db.prepare('DELETE FROM visitor_reviews WHERE user_id=? AND media_type=? AND tmdb_id=?').bind(user.id,type,id).run();
    else {
      if(!Number.isInteger(input.rating) || input.rating<1 || input.rating>10) throw new HttpError(422,'Choose a rating from 1 to 10.');
      const review=text(input.review ?? '',2000,true);
      await db.prepare(`INSERT INTO visitor_reviews(user_id,media_type,tmdb_id,rating,review) VALUES (?,?,?,?,?)
        ON CONFLICT(user_id,media_type,tmdb_id) DO UPDATE SET rating=excluded.rating,review=excluded.review,updated_at=CURRENT_TIMESTAMP`).bind(user.id,type,id,input.rating,review).run();
    }
    return json({success:true});
  }
  throw new HttpError(405,'Method or endpoint not supported.');
}
