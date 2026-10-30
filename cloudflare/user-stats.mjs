import { HttpError, authorize } from './auth.mjs';
import { json, limit } from './api.mjs';
import { anonymousStatistics } from './anonymous-activity.mjs';

export async function recordVisitorActivity(db, userId, timestamp = Math.floor(Date.now()/1000)) {
  const day = new Date(timestamp * 1000).toISOString().slice(0,10);
  await db.prepare(`INSERT INTO visitor_daily_activity(user_id,activity_date,last_seen) VALUES (?,?,?)
    ON CONFLICT(user_id,activity_date) DO UPDATE SET last_seen=MAX(last_seen,excluded.last_seen)
    WHERE visitor_daily_activity.last_seen<excluded.last_seen-60`).bind(userId,day,timestamp).run();
}
export async function userStatistics(db, at = new Date()) {
  const today = at.toISOString().slice(0,10);
  const queries = [
    db.prepare('SELECT COUNT(*) AS total FROM visitors'),
    db.prepare(`SELECT COUNT(DISTINCT CASE WHEN activity_date=? THEN user_id END) AS daily,
      COUNT(DISTINCT CASE WHEN activity_date>=date(?,'-6 days') THEN user_id END) AS weekly,
      COUNT(DISTINCT user_id) AS monthly FROM visitor_daily_activity
      WHERE activity_date BETWEEN date(?,'-29 days') AND ?`).bind(today,today,today,today),
    db.prepare(`WITH RECURSIVE days(day) AS (SELECT date(?,'-29 days') UNION ALL SELECT date(day,'+1 day') FROM days WHERE day<?)
      SELECT day AS date,
      (SELECT COUNT(DISTINCT user_id) FROM visitor_daily_activity WHERE activity_date=day) AS daily,
      (SELECT COUNT(DISTINCT user_id) FROM visitor_daily_activity WHERE activity_date BETWEEN date(day,'-6 days') AND day) AS weekly,
      (SELECT COUNT(DISTINCT user_id) FROM visitor_daily_activity WHERE activity_date BETWEEN date(day,'-29 days') AND day) AS monthly
      FROM days ORDER BY day`).bind(today,today),
    db.prepare('SELECT started_at FROM visitor_activity_settings WHERE id=1'),
  ];
  const result=await db.batch(queries), startedAt=result[3].results[0]?.started_at;
  if(!startedAt) throw new HttpError(503,'User activity tracking has not been initialized.');
  const startedDay=startedAt.slice(0,10);
  return {
    total:result[0].results[0].total, ...result[1].results[0],
    history:result[2].results.map(row => ({date:row.date,daily:row.date<startedDay?null:row.daily,weekly:row.date<startedDay?null:row.weekly,monthly:row.date<startedDay?null:row.monthly})),
    generatedAt:at.toISOString(),trackingStartedAt:startedAt,timezone:'UTC',
    definition:'Distinct registered accounts with a recorded authenticated request. Daily: today. Weekly: today and previous 6 days. Monthly: today and previous 29 days. UTC.',
    partialHistory:Date.parse(startedAt.endsWith('Z')?startedAt:startedAt.replace(' ','T')+'Z') > Date.parse(today+'T00:00:00Z')-29*86400000,
  };
}
export async function adminUserStatistics(request,env,db) {
  await authorize(request,env,db);
  if(request.method!=='GET') throw new HttpError(405,'Method not allowed.');
  await limit(db,request,'admin-user-stats',60);
  const at = new Date();
  return json({ ...await userStatistics(db, at), anonymous:await anonymousStatistics(db, at) });
}
