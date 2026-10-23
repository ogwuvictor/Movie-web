# Security review — 23 October 2026

The later Cloudflare Worker + D1 path is documented in [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md). It uses Cloudflare Access with verified JWTs and protected `/admin/api/*` routes instead of PHP password sessions. The PHP-specific session tests and configuration below apply to the retained PHP backend. Local fixtures do not verify live Access sign-in or deployed account policies.

This update hardens the application; it is not a guarantee of 100% security or an independent penetration test. Production infrastructure and third-party providers are outside the local test environment.

## Changes

- Movie-management writes, availability-catalog writes, feature changes, system/cache/A-B metric writes and password changes require a current admin session. Analytics and performance reports require admin login. Public movie lookup and bounded visitor telemetry remain available.
- Admin login and all authenticated mutations require CSRF tokens. Logout uses POST with a token. Login attempts are limited per account and IP; password-change attempts and public telemetry have separate limits. Rate-limit storage is outside the web root and storage failures fail closed.
- Session cookies are HttpOnly, SameSite=Strict and Secure over HTTPS. Session IDs rotate at login and password change. Sessions expire after 30 minutes idle or eight hours total. Password changes, account deletion and username changes invalidate older sessions. Existing owner credentials were not changed.
- Admin data is escaped before HTML insertion. Inline event handlers were replaced with event listeners, and the admin script uses a per-response CSP nonce. JSON requests have size/depth/type limits; identifiers, movie fields, telemetry fields and download URLs are validated. Database errors are logged server-side, with generic client responses.
- CORS uses an explicit origin allowlist. Backend responses include CSP, anti-framing, nosniff, referrer and permission headers; HTTPS responses include HSTS. Remote plaintext backend access and remote use of default root/blank database credentials are rejected.
- The local PHP router and Apache rules block configuration, SQL, debug, library and data files. Only the PHP development router's HTTP behavior was tested locally; Apache hosting must also be checked after deployment.
- Download links reject executable URL schemes and embedded credentials. Optional click tracking cannot break provider navigation when browser storage is unavailable.
- All four external player iframes have a sandbox allowing scripts, their own origin, forms and presentation, while withholding popups, downloads and top-level navigation. Fullscreen delegation remains enabled. The existing provider opt-in configuration remains in place; no provider is newly represented as verified.
- Production API calls use `/api` by default instead of a visitor's localhost. `REACT_APP_API_BASE_URL` can select an HTTPS API. Frontend hosting header templates are included for Apache and hosts supporting `_headers`.
- Compatible dependency patches, targeted transitive overrides and React Router 7.18.4 replace affected versions. Jest's legacy resolver has an explicit router-subpath mapping and encoding polyfill. Build/test dependencies are classified as development dependencies. Environment files are ignored by Git.

## Dependency results

Using the official registry (`https://registry.npmjs.org`), the initial audit reported **96 findings**, including four critical. After updates:

| Scope | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Production dependencies (`--omit=dev`) | 0 | 0 | 0 | 0 | 0 |
| Complete build/test dependency tree | 0 | 11 | 3 | 0 | 14 |

The remaining findings are in Create React App's development/build graph: `react-scripts`, `@svgr/plugin-svgo`, `@svgr/webpack`, `css-select`, `node-forge`, `nth-check`, `postcss` (the old nested copy used by `resolve-url-loader`), `resolve-url-loader`, `selfsigned`, `sockjs`, `svgo`, `uuid`, `webpack-dev-middleware` and `webpack-dev-server`. Counts include affected parent packages, not fourteen independent exploits in the browser bundle. They remain unresolved. npm's suggested forced replacement of `react-scripts` with `0.0.0` is not a usable fix. Replacing the legacy toolchain requires a separate migration and regression review; incompatible dependency majors were not forced into it.

Do not expose the development servers or deploy `node_modules`. Build trusted source/assets in an isolated environment and deploy the static `build` output. An audit result of zero known production advisories does not prove the absence of vulnerabilities.

## Verification

- Production React build succeeds; existing lint/toolchain warnings remain.
- All 92 React tests pass, including real Home/About route navigation, movie/TV identity handling, URL validation, source selection and iframe restrictions. The obsolete starter test was replaced with an application navigation test.
- Chrome security tests use a disposable admin and remove it afterward. They cover anonymous-write/private-report rejection, missing/incorrect CSRF tokens, login throttling, login session rotation, password-change session revocation, POST logout, CORS, request limits, blocked sensitive files, stored HTML escaping and dashboard HTML escaping. The owner account is untouched.
- Catalog browser QA verifies authenticated create/edit/delete, invalid records, CSRF rejection and mobile overflow, then removes its synthetic catalog record.
- Controlled embed documents verify blocked popups and blocked top-level redirects after a user click for all four configured provider origins at desktop/mobile sizes. These are security fixtures, not live provider playback tests.
- A real CC0 flower video plays and enters/exits fullscreen in portrait/landscape in controlled cross-origin embeds for all four integration paths. This establishes browser compatibility with the sandbox, not movie availability or provider authorization.
- Movie/TV Watch actions, server selection, episode changes, trailer navigation and responsive layouts are checked in browser fixtures. Provider movies themselves are not certified as safe, correctly matched, available or licensed.

Local checks (PowerShell, MySQL running; Playwright installed in the existing local QA tools):

```powershell
./scripts/start-backend.ps1
# In another terminal:
php scripts/verify-admin-catalog.php
$env:CINEHUB_SECURITY_QA='1'
php scripts/verify-admin-catalog.php
Remove-Item Env:CINEHUB_SECURITY_QA
$env:CI='true'
npm test -- --watchAll=false --runInBand
npm run build
node scripts/serve-build.cjs
# In another terminal, while the build QA server runs:
node scripts/verify-embed-security-browser.cjs
node scripts/verify-mobile-fullscreen-browser.cjs
node scripts/verify-watch-browser.cjs
npm audit --registry=https://registry.npmjs.org
npm audit --omit=dev --registry=https://registry.npmjs.org
```

Repeated intentional login-failure tests can hit the same loopback IP limit. Wait for the 15-minute window to expire rather than disabling production throttling.

## Production configuration and remaining limitations

1. Serve the frontend build and PHP backend through a maintained HTTPS web server. The PHP development server is loopback-only and is not a production server. The frontend document root must be `build`, never the repository root. Map `/api` and `/admin` to the PHP backend, or configure `REACT_APP_API_BASE_URL` and a separate admin origin. Keep credentials, database dumps, source and QA scripts outside public document roots.
2. Set `CINEHUB_DB_HOST`, `CINEHUB_DB_NAME`, `CINEHUB_DB_USER`, `CINEHUB_DB_PASS` in the server environment. Use a dedicated least-privilege database account. Local root/blank defaults are only for the existing loopback development setup. Use a supported PHP/MySQL/Node release and maintain OS/server patches.
3. Set `CINEHUB_ALLOWED_ORIGINS` to the exact frontend origin(s), separated by commas. The admin is same-origin; credentialed cross-origin administration is not enabled. Terminate TLS correctly. Set `CINEHUB_HTTPS=1` only behind a trusted HTTPS-only reverse proxy that cannot be bypassed; arbitrary forwarded headers are deliberately not trusted.
4. Ensure private PHP session storage and the temporary rate-limit directory are writable only by the service account. The catalog writer also needs its documented directory permissions. Monitor disk capacity and authentication errors. For multiple backend instances, replace local rate-limit/session files with coordinated shared storage before scaling.
5. Apply the frontend `_headers` rules or equivalent server headers. Apache requires headers/rewrite modules and permission to read the supplied `.htaccess` rules. Other hosts need equivalent configuration. Verify HTTPS, response headers and sensitive-file denial on the actual public URL; these deployment settings have not been tested on a production host.
6. Third-party embed contents, redirects inside their own frame, outbound network requests, tracking and video identity cannot be controlled or certified by this application. The sandbox blocks specific escape actions; it does not make provider code trustworthy. Some providers reject sandboxed playback. Do not relax those restrictions to restore playback. A trusted authorized source is still required for dependable movie/TV delivery.
7. Existing TMDB metadata API keys remain visible in frontend code/history. They are not administrator credentials, but can be copied and consume API quota. For private-key handling, rotate the existing key and move TMDB access behind a rate-limited backend proxy; never put a private key in a `REACT_APP_*` variable. No provider agreement or licensed movie catalog was supplied or verified by this review.
8. Public visitor telemetry can still be fabricated by a client within the rate limits. Its aggregates are not authenticated business records. Production monitoring, backups/restore testing, database network isolation, admin access restrictions/MFA and an independent security assessment remain operational work, not guarantees provided by this patch.

Reference: the router's official [v7 compatibility exports](https://api.reactrouter.com/v7/modules/react-router-dom.html) retain the application's existing imports. The remaining advisories can be reproduced using the pinned lockfile and official-registry audit commands above.
