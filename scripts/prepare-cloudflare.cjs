// Reuse the existing admin markup/styles; never upload or execute PHP on Workers.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
const clean = html => html
  .replace(/<\?= htmlspecialchars\(\$csrf, ENT_QUOTES, 'UTF-8'\) \?>/g, '__CSRF__')
  .replace(/<\?= htmlspecialchars\(securityNonce\(\), ENT_QUOTES, 'UTF-8'\) \?>/g, '__NONCE__');
let dashboard = clean(read('backend/admin/index.php').replace(/^<\?php[\s\S]*?\?>/, ''));
dashboard = dashboard.replace(/<\?php if \(empty\(\$movies\)\): \?>[\s\S]*?<\?php endif; \?>/, '__MOVIE_ROWS__');
dashboard = dashboard.replaceAll('../api/', '/admin/api/');
const changePasswordStart = dashboard.indexOf('// Change password');
if (changePasswordStart < 0) throw Error('Password-change handler not found');
dashboard = dashboard.slice(0, changePasswordStart) + dashboard.slice(changePasswordStart).replace('alert(data.message);', "alert(data.message); window.location.href = '/admin/login.php'; return;");
dashboard = dashboard.replaceAll('maxlength="72"', 'maxlength="128"').replace('> 72)', '> 128)').replace('at most 72 UTF-8 bytes', 'at most 128 UTF-8 bytes');
let login = read('backend/admin/login.php').replace(/^<\?php[\s\S]*?\?>/, '');
login = login.replace(/<\?php if \(\$error\): \?>[\s\S]*?<\?php endif; \?>/, '__LOGIN_ERROR__')
  .replace(/<\?= htmlspecialchars\(securityCsrf\(\), ENT_QUOTES, 'UTF-8'\) \?>/g, '__LOGIN_CSRF__')
  .replace('>Username</label>', '>Username or email</label>')
  .replace('name="username" required', 'name="username" autocomplete="username" maxlength="254" required')
  .replace('name="password" required', 'name="password" autocomplete="current-password" maxlength="128" required');
let streaming = clean(read('backend/admin/streaming.php').replace(/^<\?php[\s\S]*?\?>/, ''));
streaming = streaming.replace(/<\?php foreach \([\s\S]*?<\?php endforeach; \?>/, Object.entries({ vidlink: 'VidLink Pro', videasy: 'Videasy', vidfast: 'Vidfast', movies111: '111Movies' }).map(([id, name]) => `<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" name="catalogServer" value="${id}" id="catalog-${id}"><label class="form-check-label" for="catalog-${id}">${name}</label></div>`).join(''));
for (const html of [dashboard, streaming, login]) if (html.includes('<?')) throw Error('Unconverted PHP in admin template');
fs.mkdirSync(path.join(root, 'cloudflare/generated'), { recursive: true });
fs.writeFileSync(path.join(root, 'cloudflare/generated/admin.mjs'), `// Generated from existing PHP admin markup; do not edit.\nexport const login = ${JSON.stringify(login)};
export const dashboard = ${JSON.stringify(dashboard)};\nexport const streaming = ${JSON.stringify(streaming)};\nexport const streamingScript = ${JSON.stringify(read('backend/admin/streaming.js').replaceAll('../api/', '/admin/api/'))};\n`);
console.log('Cloudflare admin templates prepared without PHP source.');
