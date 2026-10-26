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

## Visitor accounts, favorites and watchlists

Visitor accounts use `/account`, with separate database tables and a separate HttpOnly session cookie from admin login. Visitors cannot access admin APIs. The same private `ADMIN_SESSION_SECRET` signs domain-separated visitor tokens; rotating it revokes both kinds of sessions. Visitor signup/sign-in uses the same strong scrypt settings and has the same free-plan CPU limitation described above. This must be tested on the deployed plan before launch.

Before deploying this version to an existing database, apply the additive visitor migration once (safe to repeat):

```powershell
npx wrangler@4.152.0 d1 execute cinehub --remote --file=cloudflare/migrations/20261026_visitors.sql
```

For local use, replace `--remote` with `--local`, build with `npm run build:cloudflare`, then run `npx wrangler@4.152.0 dev`. Open `http://127.0.0.1:8787/profile`. The CRA server (`npm start`, port 3000) also forwards `/api/community/*` to this local Worker on port 8787 using `src/setupProxy.js`; restart CRA after adding/changing that proxy. Both servers must run for account features on port 3000. The proxy validates browser Origin before forwarding to the loopback Worker, and production does not use it. The legacy PHP backend does not implement these endpoints. New databases can use the full `cloudflare/schema.sql`, which includes both admin and visitor migrations. No visitor data is seeded or imported automatically.

All movie and TV details pages show a bookmark/watchlist control, including for guests. Guests get a keyboard-accessible login popup; signing in completes the requested save, without toggling off a previously saved title. The popup links to `/signup` and returns the new account to the selected details page. Saved lists and the private profile are at `/profile` (`/account` remains an alias). The profile displays the signed-in visitor's username and email; it is not a public profile directory. Initial background account failures do not display a generic account banner on each title; explicit sign-in/save failures still show actionable errors and do not pretend that anything was saved.

Visitors register with a unique public username, email and password (12 characters minimum, 128 UTF-8 bytes maximum). Email addresses are not verified; an account does not establish ownership of its submitted email. There is no email delivery, forgotten-password recovery or visitor password-change screen yet. Never reuse an admin password for a visitor account.

Favorites and watchlists are private to the signed-in visitor, persist in D1 and distinguish movie and TV IDs. The profile has separate Watchlist and Favorites tabs, global per-list counts, movie/TV filters and poster cards. Library pagination is 50 entries within the selected list/filter; pagination controls appear only when needed. Counts come from the database across the full saved collection, not the current page. Titles and poster paths are snapshots from the details page. Failed-poster fallbacks and explicit empty/loading/error states are supported. Removing a title affects only the selected list. Saved buttons use dedicated styles to avoid global Bootstrap outline-button color conflicts.

Signup, login and mutations have database-backed rate limits, same-origin checks and CSRF validation. Sessions expire after 30 minutes idle or eight hours total. Visitor session identifiers are stored only as keyed digests. Community reviews and ratings are currently paused: their interface and background requests have been removed, and GET/PUT/DELETE review endpoints return 404 while COMMUNITY_REVIEWS_ENABLED is false in cloudflare/visitors.mjs. Existing review rows are retained; title-state responses no longer expose reviews. TMDB metadata ratings are unaffected. No saved-list action affects streaming rights or source availability.

Run `node scripts/verify-visitors.cjs` for isolated backend security and persistence tests. After the production build completes, `node scripts/verify-visitors-browser.cjs` tests registration, login, collection tabs/filters, readable saved states, failure/retry and removal of reviews through the actual React bundle and Worker handlers in Chrome at phone/desktop widths, using isolated SQLite and mocked TMDB metadata. These are not deployed D1 or real-device tests.

## Registered-user activity dashboard

The Worker admin dashboard's **Users** tab shows registered visitor accounts and distinct daily, 7-day and 30-day active accounts, a responsive chart and an accessible exact-values table. It excludes separate admin accounts and anonymous visitors. It does not count verified humans, concurrent viewers or successful movie playback. An account used on two devices is still one account.

After installing the visitor migration above, apply the additive activity migration before deploying this version:

```powershell
npx wrangler@4.152.0 d1 execute cinehub --remote --file=cloudflare/migrations/20261026_user_activity.sql
```

Use `--local` for local preview. The full schema already includes this migration. `visitor_daily_activity` records one row per account per UTC date, through successful authentication and authenticated account/API requests. The React app sends a visible-route activity request and throttles interaction checks to at most one per five minutes. There is no background interval keeping idle tabs active. Activity checks do not create or rotate login-form cookies. Signed-out requests, invalid/expired sessions and failed logins do not count. Session activity itself is bounded by the normal 30-minute idle and eight-hour absolute session expiry.

Daily = today (UTC); weekly = today and the previous six UTC dates; monthly = today and the previous 29 UTC dates. Each historical chart point uses the same rolling windows ending on that date, not summed daily totals. Earlier activity cannot be reconstructed: dates before migration/tracking start are shown as missing, and a partial-history message remains until 30 days of tracking exist. The tracking-start setting is inserted once and is preserved on repeated migrations. Blocked or failed requests and offline use cannot be recorded. No IP addresses or emails are stored in the daily-activity table.

Counts come from D1 primary-session queries, are never cached and show a server refresh timestamp. The visible Users tab refreshes every 60 seconds or via its Refresh button; it is not a real-time online-presence counter. A failed refresh clears figures, chart and table instead of retaining stale data. `/admin/api/users.php` and `/admin/users.js` require an admin session; visitor sessions do not grant access.

The Cloudflare dashboard now removes the unconnected Optimization/feature-flag controls, Cache Metrics table and Recorded Engagement Events card. Recorded page views, searches, provider clicks, client API performance, movie management and streaming availability remain. Existing data tables/APIs and the legacy PHP dashboard are preserved; the new user report runs in the Worker admin, not the separate PHP/MySQL admin.

`node scripts/verify-user-stats.cjs` verifies unique counts, UTC/window boundaries, missing history, repeatable migrations and access controls. `node scripts/verify-cloudflare.cjs --browser` checks the chart, exact table, responsive admin layouts, outage clearing and recovery with isolated SQLite fixtures. Visitor browser checks cover 320px/390px phones, 844px landscape, 768px tablet and 1440px desktop, including short-height dialogs and long private email addresses. These emulate viewports; they do not certify every physical phone/browser or on-screen keyboard.

## Admin sessions and recovery

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
