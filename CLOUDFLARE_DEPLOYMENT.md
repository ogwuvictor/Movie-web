# Cloudflare deployment and built-in admin login

The React site, API, admin dashboard and D1 database run through the `cinehub` Worker. The admin now uses its own username/email and password login, not Cloudflare Access. The existing public site design and legacy PHP/MySQL backend are unchanged. The new authentication code is local until explicitly deployed; it does not automatically replace a live deployment.

## Hosting constraint before deployment

Passwords use Node's native scrypt with N=65536, r=8, p=2 (64 MiB working memory), an [OWASP-recommended profile](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). No weak-hash fallback is provided. [Workers supports Node crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/), but the [Workers Free CPU allowance](https://developers.cloudflare.com/workers/platform/limits/) is small and strong password hashing can exceed it. Local Wrangler does not establish production CPU-plan compatibility. Before relying on this login, test an actual deployed sign-in, failed sign-in and password change under your plan and inspect CPU/error metrics. A paid Worker plan or a managed identity provider may be needed. Do not lower the hash cost to force it onto the free plan.

## Build configuration

| Setting | Value |
| --- | --- |
| Worker name | `cinehub` |
| Branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx wrangler@4.152.0 deploy` |
| Assets | `./build`, already configured in `wrangler.jsonc` |

Use Workers Builds, not a static Pages-only upload. Keep development dependencies installed for CRA. The build is tested with `CI=true`; lint warnings are not suppressed. Never upload the repository root or PHP source as static assets. The configured D1 binding is `DB`, database name `cinehub`. Use the supplied database ID already in `wrangler.jsonc`.

## Create the first admin privately

There is no public signup, browser bootstrap link, default username or default password. Cloudflare/PHP credentials are not copied. A database operator creates the account through an interactive terminal.

1. Run `npm ci`, then `npm run build:cloudflare`.
2. In PowerShell in the project folder, run `npm run admin:create`. Enter your chosen username, email and password. The password prompts hide typing. Use a long unique passphrase and a password manager. Do not put passwords in command-line arguments or send them in chat.
3. The tool generates three **ignored private files**:
   - `cloudflare/generated/admin-account-TIMESTAMP.sql`: the account identity, random salt and scrypt hash; never plaintext credentials.
   - `cloudflare/auth.local.json`: only a generated 256-bit `ADMIN_SESSION_SECRET`, for an intentional runtime-secret upload. Back it up securely; never commit or publish it.
   - `.dev.vars`: the same secret for local Wrangler. Existing unrelated settings are preserved. Conflicting existing secrets cause an error rather than silent rotation.
4. The tool does not deploy, upload secrets, run SQL or change any account. For **local testing**, apply the migration and the exact account filename printed by the tool:

   ```powershell
   npx wrangler@4.152.0 d1 execute cinehub --local --file=cloudflare/migrations/20261026_admin_login.sql
   npx wrangler@4.152.0 d1 execute cinehub --local --file=cloudflare/generated/admin-account-TIMESTAMP.sql
   npx wrangler@4.152.0 dev
   ```

   Open the local Wrangler address followed by `/admin/`. It redirects to `/admin/login.php`. The SQL filename above is a placeholder: use the printed filename.

## Production rollout, only when ready

Sign in to your Cloudflare account using `npx wrangler@4.152.0 login`. For an existing D1 database, use the additive login migration, not a destructive database replacement:

```powershell
npx wrangler@4.152.0 d1 execute cinehub --remote --file=cloudflare/migrations/20261026_admin_login.sql
npx wrangler@4.152.0 d1 execute cinehub --remote --file=cloudflare/generated/admin-account-TIMESTAMP.sql
npx wrangler@4.152.0 secret bulk cloudflare/auth.local.json
npm run build:cloudflare
npm run check:cloudflare
npx wrangler@4.152.0 deploy
```

Secret upload and deploy commands modify the live Worker. Run them intentionally; local test commands do not authorize or perform deployment. For a completely new database, initialize `cloudflare/schema.sql` before importing the generated account SQL. The schema contains the login tables as well as the API tables. Existing MySQL records are not automatically imported.

Cloudflare Access variables (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAILS`) are no longer read by the login code. If you previously protected the hostname or `/admin` in Cloudflare Access, remove that edge application/policy when switching to built-in login; otherwise Cloudflare will still show its login first. Do not remove Cloudflare account security. The application independently protects `/admin/*` and `/admin/api/*` with its own session checks.

The only runtime secret required for built-in login is `ADMIN_SESSION_SECRET`. Keep it out of `REACT_APP_*` variables, public files and Git. Dashboard settings are under Workers & Pages > cinehub > Settings > Variables and Secrets, separate from Build variables.

## Login and recovery behavior

- Sign in with either the provisioned username or email, case-insensitively. Unknown accounts and incorrect passwords show the same generic message. There is no public registration or email password-reset service.
- Login forms use signed, short-lived CSRF tokens; authenticated mutations and logout require a session CSRF token. Cross-origin writes are rejected. Login and password-change requests have separate database-backed rate limits and body-size limits.
- Production cookies use `__Host-`, Secure, HttpOnly, SameSite=Strict and Path=/. HTTP cookies are allowed only on local loopback development hosts. Session cookies contain random opaque tokens; only keyed token digests are stored in D1. Never use local HTTP cookie settings on a public host.
- Sessions rotate at login, allow at most five active sessions per account, expire after 30 minutes idle or eight hours total, and are revoked by logout, account disabling/deletion, password changes, operator recovery and session-secret rotation.
- Use Change Password in the dashboard to change your password; sign in again afterward. The current password is required. A password change does not change the public frontend.
- If locked out, a trusted database operator can run `node scripts/create-admin.mjs --reset`, enter the exact existing username and email, and apply the generated recovery SQL to the intended local or remote database. Check that one matching account exists before doing so. It resets that account's password and deletes its sessions; it does not enable a disabled account. There is no anonymous recovery endpoint.
- Old PHP credentials remain unchanged. An imported PHP bcrypt password is not a supported D1 password record; provision a fresh account instead.

## Verification and launch checks

`npm run test:cloudflare` runs the actual Worker handlers against isolated SQLite, including login/password/session and API tests. `node scripts/verify-admin-auth.cjs --browser` exercises real form login and logout in Chrome against the local handler. `node scripts/verify-cloudflare.cjs --browser` checks reports, catalog edits and frontend telemetry. These are not deployed sign-in tests. Local Wrangler must also be exercised to check native scrypt and D1 integration.

For reproducible native-runtime QA, run `node scripts/verify-admin-runtime.cjs --prepare`, then run the local D1 seed and Wrangler commands it prints. In another terminal, run `node scripts/verify-admin-runtime.cjs`. It uses disposable accounts, a separate local database state directory and a test-only secret, not the owner account. Stop the test emulator afterward. Browser scripts expect the existing local Playwright installation used by this project's QA scripts and Chrome at its standard Windows path. Concurrent password derivations in one isolate return 429 instead of allocating multiple 64 MiB buffers; retry later rather than lowering the hash cost.

Before launch, on the actual deployed hostname:

- Test successful and failed login plus password change within the deployed CPU/resource allowance. Check that `/api/health` reports configured; this checks the schema, secret presence and a non-disabled account, not successful password verification.
- A private browser must be redirected from `/admin/` to login and receive 401 from `/admin/api/*`. Mutations without a valid CSRF token must fail. An old Access token must not grant access.
- Check logout, old-cookie replay, idle expiry, password-change revocation and operator recovery. Test every hostname you enable, or disable alternate preview URLs.
- Test a temporary movie/catalog add/edit/delete and verify that dashboard totals reflect recorded D1 events. Check that outage states clear stale values. Keep secrets, hashes and session tokens out of logs.

Traffic totals are client-reported recorded events, not verified unique users or proof of video playback. Ad blockers, network errors, quotas and modified clients affect counts. Engagement, playback and cache/system collectors are not all connected. Existing development-tool advisories and third-party embed limitations remain documented in `SECURITY.md`. The external providers are not verified for movie identity, playback or licensing. The iframe sandbox remains removed at the owner's request; provider popups and redirects can occur.
