import { timingSafeEqual } from 'node:crypto';
const encoder = new TextEncoder();
// Rolling inactivity expiry. Passive dashboard polling must not renew access.
export const ADMIN_SESSION_IDLE_SECONDS = 24 * 3600;
const renewedAdminCookies = new WeakMap();
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
export const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
export const equal = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = encoder.encode(a), right = encoder.encode(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
export function authConfig(env) {
  if (!/^[a-f0-9]{64}$/i.test(env.ADMIN_SESSION_SECRET || '')) throw new HttpError(503, 'Admin sign-in is not configured. Set ADMIN_SESSION_SECRET and initialize the admin account.');
  return env.ADMIN_SESSION_SECRET;
}
export async function mac(env, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(authConfig(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function cookieName(request, kind = 'session') { return (new URL(request.url).protocol === 'https:' ? '__Host-' : '') + 'cinehub_' + kind; }
export function cookieValue(request, kind = 'session') {
  const name = cookieName(request, kind) + '=';
  const values = (request.headers.get('Cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(name));
  return values.length === 1 ? values[0].slice(name.length) : '';
}
export function setCookie(request, token, seconds, kind = 'session') {
  return `${cookieName(request, kind)}=${token}; Path=/; Max-Age=${seconds}; HttpOnly; SameSite=Strict${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function refreshAdminSessionCookie(request, response) {
  const cookie = renewedAdminCookies.get(request);
  renewedAdminCookies.delete(request);
  // Logout/password changes deliberately clear the cookie and take precedence.
  if (!cookie || response.headers.has('Set-Cookie')) return response;
  const headers = new Headers(response.headers);
  headers.set('Set-Cookie', cookie);
  return new Response(response.body, { status:response.status, statusText:response.statusText, headers });
}
export async function loginToken(request, env) {
  const value = randomToken() + '.' + (Math.floor(Date.now() / 1000) + 900);
  return value + '.' + await mac(env, 'login:' + new URL(request.url).origin + ':' + value);
}
export async function verifyLoginToken(request, env, token) {
  const parts = String(token || '').split('.'); const now = Math.floor(Date.now() / 1000);
  if (parts.length !== 3 || !/^[a-f0-9]{64}$/.test(parts[0]) || !/^\d{10}$/.test(parts[1]) || Number(parts[1]) < now || Number(parts[1]) > now + 900 ||
      !equal(token, cookieValue(request, 'login')) || !equal(parts[2], await mac(env, 'login:' + new URL(request.url).origin + ':' + parts[0] + '.' + parts[1]))) throw new HttpError(403, 'Invalid login form. Reload the sign-in page and try again.');
}
export async function authorize(request, env, db = env.DB) {
  authConfig(env); const token = cookieValue(request);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, 'Administrator sign-in required.');
  const tokenHash = await mac(env, 'session:' + token); const now = Math.floor(Date.now() / 1000);
  const user = await db.prepare(`SELECT u.id,u.email,u.username,u.password_version,s.last_seen,s.expires_at
    FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.password_version=u.password_version AND u.disabled=0 AND s.expires_at>? AND s.last_seen>?`)
    .bind(tokenHash, now, now - ADMIN_SESSION_IDLE_SECONDS).first();
  if (!user) throw new HttpError(401, 'Administrator sign-in expired or invalid.');
  if (request.headers.get('X-Admin-Passive') !== '1') {
    await db.prepare(`UPDATE admin_sessions SET last_seen=MAX(last_seen,?),expires_at=MAX(expires_at,?)
      WHERE token_hash=? AND last_seen>? AND expires_at>?`).bind(now, now + ADMIN_SESSION_IDLE_SECONDS, tokenHash, now - ADMIN_SESSION_IDLE_SECONDS, now).run();
    renewedAdminCookies.set(request, setCookie(request, token, ADMIN_SESSION_IDLE_SECONDS));
  }
  return { ...user, tokenHash, csrf: await mac(env, 'csrf:' + token) };
}
export function checkCsrf(request, identity, token = request.headers.get('X-CSRF-Token')) {
  if (!equal(token, identity.csrf)) throw new HttpError(403, 'Invalid session token. Reload the page.');
}
