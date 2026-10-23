const encoder = new TextEncoder();
const cachedKeys = new Map();
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
export function accessConfig(env) {
  const team = env.ACCESS_TEAM_DOMAIN || '';
  const emails = (env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !env.ACCESS_AUD || !emails.length) throw new HttpError(503, 'Admin sign-in is not configured.');
  return { team, emails };
}
export async function authorize(request, env) {
  const { team, emails } = accessConfig(env);
  const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith('CF_Authorization='))?.slice(17);
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || cookie;
  if (!token || token.length > 16384) throw new HttpError(401, 'Administrator sign-in required.');
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw Error('Malformed token');
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    const now = Date.now() / 1000;
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || claims.iss !== `https://${team}` ||
      !Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD) || !Number.isFinite(claims.exp) || claims.exp <= now ||
      (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30)) ||
      !Number.isFinite(claims.iat) || claims.iat > now + 30 || !claims.sub || !emails.includes(String(claims.email || '').toLowerCase())) throw Error('Invalid claims');
    let cached = cachedKeys.get(team);
    if (!cached || cached.until < Date.now() || !cached.keys.some(key => key.kid === header.kid)) {
      let response;
      try { response = await fetch(`https://${team}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(8000) }); }
      catch { throw new HttpError(503, 'Sign-in verification unavailable.'); }
      if (!response.ok) throw new HttpError(503, 'Sign-in verification unavailable.');
      let data;
      try { data = await response.json(); } catch { throw new HttpError(503, 'Sign-in verification unavailable.'); }
      if (!Array.isArray(data.keys)) throw new HttpError(503, 'Sign-in verification unavailable.');
      cached = { keys: data.keys, until: Date.now() + 300000 };
      cachedKeys.set(team, cached);
    }
    const jwk = cached.keys.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256'));
    if (!jwk) throw Error('Unknown key');
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`))) throw Error('Invalid signature');
    return { email: claims.email.toLowerCase(), csrf: await hash('cinehub-csrf:' + token) };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Administrator sign-in expired or invalid.');
  }
}
export function checkCsrf(request, identity, token = request.headers.get('X-CSRF-Token')) {
  // Token is a digest of the validated HttpOnly Access bearer cookie, never the bearer itself.
  if (typeof token !== 'string' || token !== identity.csrf) throw new HttpError(403, 'Invalid session token. Reload the page.');
}
