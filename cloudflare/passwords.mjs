import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { HttpError } from './auth.mjs';
// OWASP's scrypt N=2^16, r=8, p=2 profile. No weaker free-plan fallback.
const options = { N: 65536, r: 8, p: 2, maxmem: 96 * 1024 * 1024 };
let deriving = false;
const derive = async (password, salt) => {
  // Two concurrent 64 MiB derivations could exhaust a Worker isolate's memory.
  // Refuse excess work rather than queueing secrets or weakening the hash.
  if (deriving) throw new HttpError(429, 'Sign-in is busy. Try again in a moment.');
  deriving = true;
  try { return await new Promise((resolve, reject) => scrypt(password, salt, 32, options, (error, result) => error ? reject(error) : resolve(result))); }
  finally { deriving = false; }
};
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 128) throw new HttpError(422, 'Use a password of at least 12 characters and at most 128 UTF-8 bytes.');
}
export async function hashPassword(password) {
  validatePassword(password); const salt = randomBytes(16).toString('hex'); const value = await derive(password, salt);
  return `scrypt$65536$8$2$${salt}$${value.toString('hex')}`;
}
export async function verifyPassword(password, record) {
  const valid = typeof record === 'string' && /^scrypt\$65536\$8\$2\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(record);
  const parts = valid ? record.split('$') : ['scrypt', '65536', '8', '2', '0'.repeat(32), '0'.repeat(64)];
  const result = await derive(password, parts[4]);
  return valid && timingSafeEqual(result, Buffer.from(parts[5], 'hex'));
}
