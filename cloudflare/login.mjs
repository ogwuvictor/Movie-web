import { login } from './generated/admin.mjs';
import { HttpError, authConfig, authorize, cookieValue, setCookie, randomToken, mac, loginToken, verifyLoginToken, checkCsrf } from './auth.mjs';
import { hashPassword, verifyPassword, validatePassword } from './passwords.mjs';
import { body, json, limit } from './api.mjs';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const redirect = (location, cookie) => new Response(null, { status: 303, headers: { Location: location, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
const failed = 'Invalid username/email or password.';

export async function readForm(request) {
  if (!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) throw new HttpError(415, 'Send a sign-in form.');
  if (Number(request.headers.get('Content-Length')) > 8192) throw new HttpError(413, 'Request too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A form is required.');
  let size = 0; const chunks = [];
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > 8192) { await reader.cancel(); throw new HttpError(413, 'Request too large.'); } chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const form = new URLSearchParams(new TextDecoder().decode(bytes));
  for (const key of form.keys()) if (form.getAll(key).length !== 1) throw new HttpError(400, 'Duplicate form fields.');
  return form;
}
function renderLogin(token, nonce, message = '', status = 200, cookie) {
  const values = { __LOGIN_CSRF__: escape(token), __NONCE__: nonce, __LOGIN_ERROR__: message ? `<div class="alert alert-danger" role="alert">${escape(message)}</div>` : '' };
  return new Response(login.replace(/__LOGIN_CSRF__|__NONCE__|__LOGIN_ERROR__/g, key => values[key]), {
    status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...(cookie ? { 'Set-Cookie': cookie } : {}) },
  });
}
export async function signIn(request, env, db, nonce) {
  authConfig(env);
  if (request.method === 'GET') {
    await limit(db, request, 'login-form', 60);
    try { await authorize(request, env, db); return redirect('/admin/'); }
    catch (error) { if (!(error instanceof HttpError) || error.status !== 401) throw error; }
    const token = await loginToken(request, env);
    return renderLogin(token, nonce, '', 200, setCookie(request, token, 900, 'login'));
  }
  if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
  const form = await readForm(request);
  await verifyLoginToken(request, env, form.get('csrf_token'));
  await limit(db, request, 'login-ip', 10, 900);
  const identifier = (form.get('username') || '').trim().toLowerCase();
  const password = form.get('password') || '';
  if (!identifier || identifier.length > 254 || !password || new TextEncoder().encode(password).length > 128) return renderLogin(form.get('csrf_token'), nonce, failed, 401);
  // One bucket per submitted identity across IPs, plus the independent IP bucket.
  const accountRequest = new Request(request.url, { headers: { 'CF-Connecting-IP': identifier } });
  await limit(db, accountRequest, 'login-account', 30, 900);
  const user = await db.prepare('SELECT id,email,username,password_hash,password_version,disabled FROM admin_users WHERE username=? OR email=? LIMIT 1').bind(identifier, identifier).first();
  const valid = await verifyPassword(password, user?.password_hash);
  if (!user || user.disabled || !valid) return renderLogin(form.get('csrf_token'), nonce, failed, 401);
  const token = randomToken(); const tokenHash = await mac(env, 'session:' + token);
  const now = Math.floor(Date.now() / 1000);
  const previous = cookieValue(request);
  const previousHash = await mac(env, 'session:' + previous);
  const result = await db.batch([
    db.prepare(`INSERT INTO admin_sessions(token_hash,user_id,password_version,created_at,last_seen,expires_at)
      SELECT ?,id,password_version,?,?,? FROM admin_users WHERE id=? AND password_version=? AND disabled=0`).bind(tokenHash, now, now, now + 28800, user.id, user.password_version),
    db.prepare("INSERT INTO admin_audit(actor,action,entity) SELECT ?,'auth.login',? WHERE changes()>0").bind(user.email, String(user.id)),
    db.prepare('DELETE FROM admin_sessions WHERE token_hash=? OR expires_at<=?').bind(previousHash, now),
    db.prepare('DELETE FROM admin_sessions WHERE user_id=? AND token_hash NOT IN (SELECT token_hash FROM admin_sessions WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 5)').bind(user.id, user.id),
  ]);
  if (!result[0].meta.changes) return renderLogin(form.get('csrf_token'), nonce, failed, 401);
  return redirect('/admin/', setCookie(request, token, 28800));
}
export async function signOut(request, env, db) {
  if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
  const identity = await authorize(request, env, db);
  const form = await readForm(request); checkCsrf(request, identity, form.get('csrf_token'));
  await db.batch([
    db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(identity.tokenHash),
    db.prepare("INSERT INTO admin_audit(actor,action,entity) VALUES (?,'auth.logout',?)").bind(identity.email, String(identity.id)),
  ]);
  return redirect('/admin/login.php', setCookie(request, '', 0));
}
export async function changePassword(request, env, db) {
  if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
  const identity = await authorize(request, env, db); checkCsrf(request, identity);
  await limit(db, request, 'password-change', 5, 900);
  const input = await body(request);
  validatePassword(input.new_password);
  if (typeof input.current_password !== 'string' || new TextEncoder().encode(input.current_password).length > 128) throw new HttpError(422, 'Invalid current password.');
  const current = await db.prepare('SELECT password_hash FROM admin_users WHERE id=? AND password_version=? AND disabled=0').bind(identity.id, identity.password_version).first();
  if (!await verifyPassword(input.current_password, current?.password_hash)) throw new HttpError(401, 'Current password is incorrect.');
  const record = await hashPassword(input.new_password), version = randomToken();
  const result = await db.batch([
    db.prepare('UPDATE admin_users SET password_hash=?,password_version=? WHERE id=? AND password_version=? AND disabled=0').bind(record, version, identity.id, identity.password_version),
    db.prepare('DELETE FROM admin_sessions WHERE user_id=? AND password_version<>?').bind(identity.id, version),
    db.prepare("INSERT INTO admin_audit(actor,action,entity) SELECT ?,'auth.password_change',? WHERE EXISTS(SELECT 1 FROM admin_users WHERE id=? AND password_version=?)").bind(identity.email, String(identity.id), identity.id, version),
  ]);
  if (!result[0].meta.changes) throw new HttpError(401, 'Session expired. Sign in again.');
  const response = json({ success: true, message: 'Password changed. Sign in again.' });
  response.headers.set('Set-Cookie', setCookie(request, '', 0));
  return response;
}
