// Offline checks only. A passed check does not replace a deployed sign-in test.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
const failures = [];
const database = config.d1_databases?.find(binding=>binding.binding==='DB');
if(!database || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(database.database_id) || /^0{8}-/.test(database.database_id)) failures.push('Create the Cloudflare D1 database and set its real database_id in wrangler.jsonc.');
if(!fs.existsSync(path.join(root,'build/index.html'))) failures.push('Run npm run build:cloudflare first.');
if(config.assets?.directory!=='./build') failures.push('Static assets must use ./build, never the repository root.');
if(!config.assets?.run_worker_first?.includes('/admin/*') || !config.assets?.run_worker_first?.includes('/api/*')) failures.push('API and admin paths must run the Worker before SPA fallback.');
if(failures.length) {console.error('Not ready to deploy:\n'+failures.map(message=>'- '+message).join('\n'));process.exitCode=1;}
else console.log('Offline package checks passed. Cloudflare Access secrets/policy, remote schema, real sign-in and live API checks are still required before launch.');
