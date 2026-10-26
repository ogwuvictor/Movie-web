// Private operator workflow. Never accepts passwords in command-line arguments.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { hashPassword } from '../cloudflare/passwords.mjs';

export async function accountSql(username, email, password, reset = false) {
  username = username.trim().toLowerCase(); email = email.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(username)) throw Error('Username must be 3-64 letters, numbers, dots, underscores or hyphens.');
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw Error('Enter a valid email address.');
  const quote = value => "'" + value.replaceAll("'", "''") + "'";
  const record = await hashPassword(password), version = randomBytes(32).toString('hex');
  const action = reset
    ? `UPDATE admin_users SET password_hash=${quote(record)},password_version=${quote(version)} WHERE username=${quote(username)} AND email=${quote(email)};\nDELETE FROM admin_sessions WHERE user_id IN (SELECT id FROM admin_users WHERE username=${quote(username)} AND email=${quote(email)});`
    : `INSERT INTO admin_users(username,email,password_hash,password_version) VALUES (${[username, email, record, version].map(quote).join(',')});`;
  return '-- Private generated account file. No plaintext password. Do not publish.\n' + action + '\n';
}

async function main() {
  if (process.argv.slice(2).some(arg => arg !== '--reset')) throw Error('Usage: node scripts/create-admin.mjs [--reset]. Enter credentials at the prompts.');
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw Error('Run this command in an interactive terminal. Passwords are not accepted through arguments or redirected input.');
  let muted = false;
  const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  rl.on('SIGINT', () => { rl.close(); process.exit(130); });
  const hidden = async prompt => {
    process.stdout.write(prompt); muted = true;
    try { return await rl.question(''); } finally { muted = false; process.stdout.write('\n'); }
  };
  try {
    const username = await rl.question('Admin username: ');
    const email = await rl.question('Admin email: ');
    const password = await hidden('Password (hidden; at least 12 characters): ');
    if (password !== await hidden('Repeat password (hidden): ')) throw Error('Passwords do not match.');
    const sql = await accountSql(username, email, password, process.argv.includes('--reset'));
    const root = fileURLToPath(new URL('../', import.meta.url));
    const secretFile = path.join(root, 'cloudflare/auth.local.json');
    const varsFile = path.join(root, '.dev.vars');
    let vars = fs.existsSync(varsFile) ? fs.readFileSync(varsFile, 'utf8') : '';
    const existing = vars.match(/^ADMIN_SESSION_SECRET=["']?([a-f0-9]{64})["']?\s*$/mi)?.[1];
    let secret;
    if (fs.existsSync(secretFile)) secret = JSON.parse(fs.readFileSync(secretFile, 'utf8')).ADMIN_SESSION_SECRET;
    else secret = existing || randomBytes(32).toString('hex');
    if (!/^[a-f0-9]{64}$/i.test(secret || '') || (existing && existing !== secret)) throw Error('Local session secrets are invalid or disagree. Resolve them before provisioning.');
    if (/^ADMIN_SESSION_SECRET=/m.test(vars) && !existing) throw Error('Existing .dev.vars secret has an unsupported format; it has not been overwritten.');
    if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, JSON.stringify({ ADMIN_SESSION_SECRET: secret }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    if (!existing) fs.writeFileSync(varsFile, vars + (vars.endsWith('\n') || !vars ? '' : '\n') + 'ADMIN_SESSION_SECRET=' + secret + '\n', { mode: 0o600 });
    fs.mkdirSync(path.join(root, 'cloudflare/generated'), { recursive: true });
    const relative = 'cloudflare/generated/admin-account-' + Date.now() + '.sql';
    fs.writeFileSync(path.join(root, relative), sql, { mode: 0o600, flag: 'wx' });
    console.log('Private SQL created: ' + relative);
    console.log('Local development secret saved in .dev.vars. No account or deployment was changed.');
    console.log('Apply the login migration, then this SQL file using Wrangler D1 with --local or --remote as intended.');
    console.log('For production, explicitly upload the runtime secret: npx wrangler@4.152.0 secret bulk cloudflare/auth.local.json');
    if (process.argv.includes('--reset')) console.log('Recovery updates only the exact username AND email. Verify one matching account exists; old sessions are removed. Disabled accounts remain disabled.');
  } finally { rl.close(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
