# Cloudflare deployment — account setup and verification

The public React design is preserved. The new Cloudflare path uses a Worker, static build assets and D1. The old PHP/MySQL backend remains available for local recovery; **do not upload the PHP source or repository root as static assets**. A Pages-only upload will not provide the admin backend.

You can start with Cloudflare's assigned `<worker-name>.<account-subdomain>.workers.dev` address. No purchased domain is required for the initial setup. The configuration enables that address and disables preview URLs; protect the actual assigned hostname's admin paths with Access. Cloudflare recommends a custom domain/route for production or business-critical use. See [workers.dev addresses](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

Admin HTML/CSS comes from the existing admin templates. Cloudflare Access replaces the PHP username/password login **for this deployment path only**. Your old PHP credentials are unchanged and are not copied into Cloudflare. The Cloudflare admin does not offer an application password-change modal; manage sign-in through your identity provider/Access instead.

## What is verified locally

- Real Worker request handlers and SQL queries were exercised against an isolated SQLite/D1 adapter, including signed Access-token verification, issuer/audience/expiry/email checks, CSRF, input limits, movie edits/deletes, catalog edits and an admin audit trail.
- Chrome checks database-to-dashboard event totals, error clearing and recovery, metrics display and catalog editing. Authentication in these tests uses temporary signed fixtures, **not the live Cloudflare login service**.
- Wrangler's pinned CLI builds the Worker bundle in dry-run mode. Cloudflare's local emulator executed all 50 schema commands, served public database lookups, accepted a telemetry write and rejected unconfigured admin access. These runtime checks are separate from a deployed database/sign-in test.
- Analytics now records route visits, completed displayed searches and configured provider redirects. These are **client-reported events**, not verified unique users, purchases or proof that a movie played. Historical traffic that was never recorded cannot be reconstructed. Ad blockers, unavailable APIs, quota exhaustion and modified clients affect totals.
- Reports use primary D1 reads and database batches, with no-store responses. The admin refreshes the visible report once per minute, shows the last successful refresh and clears values on failure. It does not promise instantaneous or continuously available information. Cache/system metrics have no active automatic collector; empty tables mean no recorded data. Feature flags are stored settings and are not wired to frontend behavior.
- Engagement/playback collectors are not connected to the public UI. A zero recorded-engagement total does not mean visitors did nothing, and an iframe load is never recorded as successful movie playback.

## Account setup required before launch

### Workers Git build configuration

Use Workers Builds with repository `ogwuvictor/Movie-web` and the following settings:

| Setting | Value |
| --- | --- |
| Worker name | `cinehub` (matches `wrangler.jsonc`) |
| Production branch | `main` |
| Root directory | Repository root (leave the optional field empty) |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx wrangler@4.152.0 deploy` |
| Static assets | `build`, already configured in `wrangler.jsonc` |

The production build is checked with `CI=true`; lint warnings remain build failures. Do not skip dependency installation or use `--legacy-peer-deps`: the lockfile includes the YAML 2 optional peer required by npm 10.9.2. Keep development dependencies installed because they contain the build tools. Workers Builds has no separate Pages output-directory setting. Leave non-production branch builds disabled until their admin hostnames and database isolation are configured.

The Worker name does not configure D1 or admin sign-in. Replace the placeholder D1 database ID and finish the Access steps below before treating deployment as ready. Build variables are separate from Worker runtime secrets; never expose the admin settings through `REACT_APP_*` variables.

1. Install a supported Node version (Node 24 is used locally). From the repo, run `npm ci` and `npm run build:cloudflare`.
2. Sign in to your own Cloudflare account using `npx wrangler@4.152.0 login`. Never commit an API token or share a password with this project.
3. Create D1: `npx wrangler@4.152.0 d1 create cinehub`. Put the returned **database_id** into the `DB` entry in `wrangler.jsonc`, replacing the all-zero placeholder. The database ID is an identifier, not an admin password.
4. Initialize the remote schema explicitly:

   ```powershell
   npx wrangler@4.152.0 d1 execute cinehub --remote --file=cloudflare/schema.sql
   ```

   This creates empty tables; it does not create a default password, fake visitor totals or sample movie/download claims. Export/review any existing MySQL records before planning a data import. The local MySQL database is **not automatically migrated**. Review its seeded movie URLs and content rights before copying them. Do not import admin password hashes; Cloudflare uses Access identity.

5. Run `npm run check:cloudflare`. It intentionally fails while the D1 ID is still a placeholder. This is an offline configuration check, not proof that the database exists or is initialized.
6. Deploy the package: `npx wrangler@4.152.0 deploy`. Only `build` static assets and the Worker are bundled. Without Access configuration, admin routes fail closed; publishing the initial package does not make the admin ready.
7. In Cloudflare Zero Trust, create a **self-hosted Access application** for the deployed hostname's `/admin/*` paths. Include `/admin` or redirect it to `/admin/` at the edge as appropriate. Permit **only your chosen admin email(s)** and use email one-time PIN or your identity provider. Require MFA through your provider when available. Configure a short session duration, and protect every hostname/preview route you enable, or disable alternate deployment URLs. Do not put an Access bypass policy on the admin or private API paths.
8. Set these Worker secrets using `npx wrangler@4.152.0 secret put NAME`, or the Cloudflare dashboard:

   - `ACCESS_TEAM_DOMAIN`: your exact team domain, such as `my-team.cloudflareaccess.com`, with no scheme or path.
   - `ACCESS_AUD`: the Application Audience tag of that specific Access application.
   - `ADMIN_EMAILS`: comma-separated exact email addresses allowed to administer the site. The Worker checks this list as well as the Access policy.

   No default email or wildcard is supplied. Keep account-specific values out of public Git commits. Worker-secret changes do not require exposing them to the frontend. Do not use `REACT_APP_*` for these settings.
9. Ensure Access covers `/admin/api/*` too. These endpoints serve private reports and mutations. Public `/api/*` endpoints permit only movie/catalog reads and bounded visitor telemetry; they do not allow administration. The Worker independently validates Access JWT signatures and claims, but edge protection is also required for Access policy/revocation enforcement. A signed token alone is not a substitute for configuring the application correctly.
10. On the actual deployed hostname, test all of the following before announcing the site:

    - `/api/health` reports `configured`; this alone does **not** verify a successful Access login.
    - A signed-out/private browser cannot access `/admin/` or `/admin/api/*` or mutate data.
    - Your allowed email can sign in through Access, view accurate database totals and perform a temporary add/edit/delete in both movie and availability editors. An unapproved email is denied.
    - Logout, session expiry and Access revocation work on **every** enabled hostname. Simulated/local JWT tests do not establish this.
    - Visit a movie page and perform one search, then check that the expected new events arrive. Counts may take until the next refresh to appear. Confirm stale data is cleared when the API is unavailable.
    - React routes work after direct navigation/reload on desktop and mobile. Backend URLs return JSON, never the SPA HTML.
    - Inspect HTTPS and response headers. Check Cloudflare logs/quotas and exercise backup/export and restore procedures before relying on stored records.

## Free-plan boundaries and unresolved launch work

Cloudflare's published free allowances currently include 100,000 Worker/Function requests per day, and D1 has 5 million rows read and 100,000 rows written per day with 5 GB total storage. Database queries/rate limits/audit records consume quota; free hosting does **not** guarantee unlimited traffic or uptime. Monitor actual usage in your account. Static asset requests and backend requests have different billing/quota behavior.

The current package still has the development-tool advisories documented in `SECURITY.md`. Existing TMDB metadata keys remain public in frontend code/history; rotate/proxy them if you need private-key handling. The four external streaming providers are not certified for playback, movie identity or licensing. Some reject the sandbox. No licensed movie/TV catalog was supplied, so this deployment preparation cannot certify a dependable public movie-streaming service. The open-license test clip is not a movie catalog.

The `cinehub` D1 binding now uses the supplied real database ID. Its initially empty remote database was initialized successfully with all 50 schema statements. Existing MySQL data has not been imported. Cloudflare Access configuration, live deployment and the deployed sign-in/API acceptance checks remain unverified. **The site is not cleared for public launch until account configuration and the live acceptance checks above pass.**

Official references: [Workers static-asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Workers/Functions free limits](https://developers.cloudflare.com/pages/functions/pricing/), [D1 pricing and limits](https://developers.cloudflare.com/d1/platform/pricing/).
