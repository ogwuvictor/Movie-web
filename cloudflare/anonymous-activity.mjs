import { cookieValue, setCookie, randomToken, mac, equal, HttpError } from './auth.mjs';
import { json } from './api.mjs';

// First-party pseudonymous browser measurement, not a login or a person count.
// The signed identifier expires after 30 days; only its keyed digest enters D1.
export async function anonymousActivity(request, env, db) {
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new HttpError(403, 'Origin not allowed.');
  const timestamp = Math.floor(Date.now() / 1000);
  const existing = cookieValue(request, 'anonymous');
  const parts = existing.split('.');
  const valid = parts.length === 3 && /^[a-f0-9]{64}$/.test(parts[0]) && /^\d{10}$/.test(parts[1]) &&
    Number(parts[1]) > timestamp && Number(parts[1]) <= timestamp + 30*86400 &&
    equal(parts[2], await mac(env, 'anonymous-cookie:' + parts[0] + '.' + parts[1]));
  const value = valid ? parts.slice(0,2).join('.') : randomToken() + '.' + (timestamp + 30*86400);
  const digest = await mac(env, 'anonymous-browser:' + value);
  const day = new Date(timestamp * 1000).toISOString().slice(0,10);
  await db.prepare(`INSERT INTO anonymous_daily_activity(browser_hash,activity_date,last_seen) VALUES (?,?,?)
    ON CONFLICT(browser_hash,activity_date) DO UPDATE SET last_seen=MAX(last_seen,excluded.last_seen)
    WHERE anonymous_daily_activity.last_seen<excluded.last_seen-60`).bind(digest,day,timestamp).run();
  // Retain enough days for all 30 historical rolling windows, bounded to 90 days.
  if (Math.random() < .01) await db.prepare("DELETE FROM anonymous_daily_activity WHERE activity_date<date(?,'-89 days')").bind(day).run();
  const response = json({ authenticated:false });
  if (!valid) response.headers.set('Set-Cookie', setCookie(request, value + '.' + await mac(env, 'anonymous-cookie:' + value), 30*86400, 'anonymous'));
  return response;
}

export async function anonymousStatistics(db, at = new Date()) {
  const today = at.toISOString().slice(0,10);
  const result = await db.batch([
    db.prepare(`SELECT COUNT(DISTINCT CASE WHEN activity_date=? THEN browser_hash END) AS daily,
      COUNT(DISTINCT CASE WHEN activity_date>=date(?,'-6 days') THEN browser_hash END) AS weekly,
      COUNT(DISTINCT browser_hash) AS monthly FROM anonymous_daily_activity
      WHERE activity_date BETWEEN date(?,'-29 days') AND ?`).bind(today,today,today,today),
    db.prepare(`WITH RECURSIVE days(day) AS (SELECT date(?,'-29 days') UNION ALL SELECT date(day,'+1 day') FROM days WHERE day<?)
      SELECT day AS date,
      (SELECT COUNT(DISTINCT browser_hash) FROM anonymous_daily_activity WHERE activity_date=day) AS daily,
      (SELECT COUNT(DISTINCT browser_hash) FROM anonymous_daily_activity WHERE activity_date BETWEEN date(day,'-6 days') AND day) AS weekly,
      (SELECT COUNT(DISTINCT browser_hash) FROM anonymous_daily_activity WHERE activity_date BETWEEN date(day,'-29 days') AND day) AS monthly
      FROM days ORDER BY day`).bind(today,today),
    db.prepare('SELECT started_at FROM anonymous_activity_settings WHERE id=1'),
  ]);
  const startedAt = result[2].results[0]?.started_at;
  if (!startedAt) throw new HttpError(503, 'Anonymous activity tracking has not been initialized.');
  return { ...result[0].results[0], trackingStartedAt:startedAt,
    history:result[1].results.map(row => ({date:row.date,
      daily:row.date<startedAt.slice(0,10)?null:row.daily,
      weekly:row.date<startedAt.slice(0,10)?null:row.weekly,
      monthly:row.date<startedAt.slice(0,10)?null:row.monthly})),
    definition:'Distinct first-party browsers observed while signed out, not people. A browser may also appear in registered activity after signing in. Cookies last up to 30 days; cookies cleared, devices, blocked requests and bots affect counts. Do not add these figures to registered users.',
  };
}
