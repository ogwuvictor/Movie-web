# MovieSync integration and verified test playback

## Provider redirect investigation

The latest screenshots show VidLink displaying video with a built-in CC control, and Vidfast displaying its own 404 for Clayface. Redirects after clicking provider controls may be advertising or other navigation initiated inside the third-party embed; their exact destination/cause was not captured by these screenshots.

A standard iframe sandbox (`allow-scripts allow-same-origin allow-presentation`) was tested as a popup/main-page-navigation blocker. Desktop/mobile Chrome fixture tests confirmed it blocked `window.open`, target-blank links and click-triggered top-page redirects while preserving normal frame scripts, progress messages and app controls. However, real provider checks using the open-license Big Buck Bunny title exposed a playback compatibility conflict: VidLink explicitly displayed **Please Disable Sandbox**, and Videasy displayed **Iframe Sandbox Detected** and refused functionality. Vidfast still refused framing, and 111Movies was blank during its check.

The sandbox experiment was **reverted from the production player** to avoid breaking the working integration. The rebuilt production app succeeded with existing warnings. The app therefore does not claim to prevent provider popups or redirects. No CSS, visible UI or provider URL was changed by this investigation. The diagnostic helper retains an optional `--sandbox` flag to reproduce the provider rejection without changing the app: `node scripts/diagnose-provider-embeds.cjs --sandbox`.

The browser cannot let the parent app freely intercept cross-origin provider clicks. Blocking popups/top navigation with sandbox can conflict with provider requirements; redirects within the iframe itself are a separate limitation. Do not bypass browser or provider restrictions. Use another source for a provider-side 404 or reject providers whose navigation behavior is unacceptable. Reference: [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox). The 50 focused tests passed during the experiment; the original player code and regression checks were restored afterward.

## Current Watch actions, server controls and duration

The latest request restores the original **Where to Watch** action: its original provider-only modal and links, or its disabled regional-unavailability state, are back. A separate **Watch Now** button, styled with the existing `netflix-play-btn` class, opens a dedicated streaming modal. Existing TV episode rows open this player with the selected series, season and episode. Download and trailer behavior remain unchanged. The new modal reuses existing Bootstrap styles; no CSS file, branding, route or dependency changed. A scoped z-index on this new modal keeps its close button above the site's existing high-z-index navbar.

The user approved a streaming-server selector inside the player. It lists the four enabled providers and permits manual switching even when an iframe loads an error document without raising a detectable error. The player is removed when its modal closes. Movie runtime is shown from TMDB metadata when available and labeled as such; it is not represented as the duration of the actual stream. VidLink's documented `PLAYER_EVENT` messages can supply actual elapsed/total playback time. The listener validates the exact iframe sender, origin, media ID/type and TV season/episode, as well as finite time values. Messages from other windows, sources or titles are ignored. No duration is invented for sources that do not report one.

The user reports that Clayface has started playing. This is a user observation, not an independent playback certification by this session. Subtitle language remains controlled by the provider's own CC/settings menu. [VidLink's official API](https://vidlink.pro/) documents external `sub_file`/`sub_label`, but not switching its existing language tracks. No supported external language-selection API was established for the other configured providers. A working wrapper subtitle selector therefore was not added; no guessed parameters, fake language list or cross-origin DOM manipulation was used. Burned-in subtitle text cannot be removed with a track selector.

Browser diagnostics using the open-license Big Buck Bunny (TMDB 10378; [Blender Foundation CC BY 3.0](https://peach.blender.org/about/)) found these failures for that title in this environment:

- VidLink: title unavailable message, no video element.
- Videasy: upstream DNS/CORS/rate-limit failures; no video available during the check.
- Vidfast: HTTP 403, blocked by `X-Frame-Options: sameorigin` in the real iframe response.
- 111Movies: redirected player reported that the title was unavailable on all its servers.

These are title/environment-specific results, not evidence that every movie fails everywhere. They also show why earlier HTTP 200/header probes were insufficient. No framing, CORS or provider restriction was bypassed. Manual source selection is now available, but it cannot make missing or blocked provider media playable.

Validation: 50 focused unit/component tests passed. The final production build passed with existing warnings. Desktop/mobile-emulated Chrome tested the restored provider modal, separate Watch Now action, all four selectable embed URLs, exact TV episode/season changes, player close/unmount, unavailable-provider state, trailer navigation, TMDB runtime and a real cross-frame event carrying fixture duration. This UI regression test uses mocked metadata and embed documents; it is not a movie playback test. `scripts/diagnose-provider-embeds.cjs` independently checks real provider embeds, and `scripts/inspect-provider-docs.cjs` checks official documentation. Screenshots are in the system temp directory as `moviesync-watch-now-<width>-<movie|tv>.png`. The mobile layout was visually inspected.

New files for this change: `src/components/StreamingModal.js`, `src/components/WatchActions.test.js`, `scripts/diagnose-provider-embeds.cjs`, and `scripts/inspect-provider-docs.cjs`. Updated: both details components, `StreamingPlayback.js` and its tests, `useStreaming.js` and its tests, `scripts/verify-watch-browser.cjs`, and this report. Run the focused suites with `src/components/WatchActions.test.js` added to the existing test command below. Current build and final validation results are included in the handoff.

All earlier sections below are historical where they conflict with this section: Watch Now, rather than Where to Watch, now owns streaming.

## Current provider activation

The user explicitly confirmed overriding the earlier verification requirement. VidLink, Videasy, Vidfast and 111Movies are now enabled with `allowUnverified: true`; their `verified` flags remain **false**. The existing Watch modal now defaults to provider embeds rather than the sample. Movie and TV selections retain their correct identifiers. No CSS, layout, route or selector was added. The standalone sample QA runner still uses only the CC0 clip.

Provider order is VidLink, Videasy, Vidfast, 111Movies. Change the order of `PLAYBACK_SERVERS` for another default; the hook also exposes `switchServer(id)` for code-driven selection. Detectable errors and initialization timeouts trigger fallback. An iframe load remains `embedded-unverified`; a provider error page or blocked media inside a loaded iframe may be undetectable and will not automatically switch. Enabling providers does not verify content rights or actual playback. Set `enabled: false` to disable a provider, or remove `allowUnverified` to restore the verification requirement.

The sample-playback report below describes the previous phase. Its statements that providers are disabled or that the Watch modal defaults to the sample are superseded by this activation section. The existing `verify-watch-browser.cjs` script tests that earlier sample-mode flow; it is not evidence of provider playback. URL, eligibility, default embed and hook switching behavior are covered by the updated focused tests.

Activation validation: **46 focused tests passed**, and `npm run build` succeeded with existing warnings. Tests confirm provider eligibility, movie/TV URL generation, default VidLink rendering, configuration-driven switching, fallback state and truthful iframe-load status. Actual third-party video playback and content authorization remain unverified. Existing CSS files and the CSS bundle hash are unchanged.

Verified on 23 October 2026. This report supersedes the earlier infrastructure-only reports.

## What now works

The existing **Where to Watch** button opens its existing modal with a native video viewport for the MDN CC0 flower sample. The modal explicitly says the clip is **not the selected movie or TV episode**. Existing provider links remain below the viewport. Play Trailer links and public-domain Download links retain their behavior. Existing TV episode rows now open the same modal with the parent series TMDB ID and that row's season/episode numbers; Enter and Space also activate the row. No server selector or new page/route was introduced.

The page layout, branding, button classes, modal classes, fonts and CSS files were preserved. The requested playback viewport and sample disclaimer are the only additions to modal content. Pages previously showing the disabled region-unavailable Watch state can now open the clearly labeled sample when valid title/episode metadata is present. Public-domain pages with only a Download action retain that action rather than gaining another button.

The actual sample file was decoded and played in real headless Chrome and Edge through Playwright. Browser results distinguish moving playback/time advancement from mere URL generation, `canplay` or iframe `load`.

## Test source and production-source separation

- Sample: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4`.
- License reference: [MDN interactive-examples CC0 license](https://github.com/mdn/interactive-examples/blob/main/LICENSE).
- The sample is configured separately in `src/streaming/testVideoSource.js`, with `testOnly: true`. It is never added to `PLAYBACK_SERVERS` or used as a failed movie/TV source's fallback.
- The current modal passes `sampleOnly` mode to the reusable viewport (its default). It passes real page/episode identifiers for selection/state isolation, but the video is always explicitly identified as an unrelated sample.
- `StreamingPlayback` with `sampleOnly={false}` uses `PLAYBACK_SERVERS`; with no authorized source configured, it reports unavailability and does not substitute the sample.
- The two source IDs in the isolated QA page use the same MDN clip. They test switching and fallback mechanics, not two independently redundant streaming services.

## Browser verification results

| Check | Result |
| --- | --- |
| Real sample decoding/playback | Passed in Chrome 155.0.8059.84 and Edge 155.0.4283.62; playback time advanced and video frames decoded |
| Native pause | Passed; paused state true and playback time stopped |
| Fullscreen | Passed in both headless browsers through a user-activated test button |
| Resume | Passed after close/reopen, using the hook's saved native-video timestamp |
| Source switching | Passed between two explicitly labeled sample configurations |
| Automatic fallback | Passed after an actual local media 404 on the first sample configuration |
| Final media failure | Passed after the final source failed; error displayed |
| Movie Watch integration | Passed in the production build in Chrome, desktop 1440x900 and mobile emulation 390x844 |
| TV Watch and episode selection | Passed with parent ID 1399, season 2/episode 3, then switching to season 3/episode 1; episode ID 98765 was not used as the series ID |
| Modal errors | Actual media 404 response produced an error and removed the video |
| Close/unmount | Passed; closing the existing modal removed the video |
| Existing links/navigation | Provider link preserved; movie/TV trailer routes opened and returned to details |
| Existing layout/style checks | Watch class unchanged; button bounds restored after modal close with fonts/poster loaded; player fit mobile viewport; CSS bundle hash unchanged |
| Unit/component tests | 44 passed across three focused suites |
| Production build | Passed with existing application/CRA warnings |

Production UI browser tests use deterministic TMDB and PHP-backend metadata fixtures while fetching and decoding the **real remote sample file**, without mocking video playback. Therefore they verify the built components, routing, Watch handlers, TV selection plumbing and real media integration; they do not certify current availability of live TMDB/backend services or playback of any actual movie/TV content. Mobile results are Chromium device emulation, not a physical iPhone/Android test. Safari, Firefox, physical devices, subtitles and multiple quality renditions were not tested. The sample has no dialogue. Fullscreen results in headless Chrome/Edge do not guarantee every mobile browser policy.

Screenshots of desktop/mobile Watch playback were captured in the system temp directory as `moviesync-watch-1440-movie.png`, `moviesync-watch-1440-tv.png`, `moviesync-watch-390-movie.png` and `moviesync-watch-390-tv.png`. Mobile sample playback was visually inspected. There is no claim of a historical screenshot comparison of the entire site.

## MovieSync provider review

The original movie and TV URL-generation patterns are preserved and covered by tests. Direct HTTP probes followed redirects without executing or playing these providers' content:

| Provider | Movie and TV endpoint results | Framing headers observed | Activation |
| --- | --- | --- | --- |
| VidLink | HTTP 200 HTML at original `vidlink.pro` paths | No X-Frame-Options or CSP received | Disabled |
| Videasy | HTTP 200 HTML after redirect to `player.videasy.to` with the corresponding movie/TV paths | No X-Frame-Options; CSP `upgrade-insecure-requests` | Disabled |
| Vidfast | HTTP 200 HTML after redirect to `vidfast.vc` with corresponding paths | No X-Frame-Options or CSP received | Disabled |
| 111Movies | HTTP 200 HTML after redirect to `player.vidlove.cc/embed/movie/550` and `/embed/tv/1399/2/3` | No X-Frame-Options or CSP received | Disabled |

Both movie `/550` and TV `/1399/2/3` URL patterns were probed, including Vidfast's exact configured query parameters `autoPlay=true&title=false&hideServer=true`. Earlier restricted-environment timeouts did not reflect these later direct HTTP results.

No framing-blocking response header was detected in these probes. This is only a limited technical observation: it does not prove successful embedding, codec support, a working stream or content rights. JavaScript restrictions, nested players, redirects, CSP on other responses, region policies, browser security and unavailable media can still prevent playback. Cross-origin iframes cannot be inspected for actual playback using an iframe `load` event. The hook reports iframe navigation as `embedded-unverified`, never as verified video playback.

No evidence establishing lawful distribution/embedding of the providers' catalogs for this deployment was found. The user has no provider agreement. Technical embed documentation (including [VidLink's documented API](https://vidlink.pro/)) is not a grant of rights to the underlying films/episodes. All four remain disabled. No commercial content from them was played, and no security, CSP, CORS or provider restriction was bypassed. These observations do not establish that every item on a provider is unlawful; they establish that authorization for this deployment has not been verified.

## Architecture for a future authorized catalog

`src/streaming/streamingServers.js` keeps provider configuration separate from presentation. Validate IDs with `validateSelection`, then filter sources using `enabled`, `verified` and `supports(selection)`. A source must restrict its supported catalog/territories to content this deployment is authorized to serve. Flags record an operator review; access control for restricted content belongs on the backend.

For movies pass `{ tmdbId: routeId, mediaType: 'movie' }`. For TV pass `{ tmdbId: seriesRouteId, mediaType: 'tv', season: season_number, episode: episode_number }`. TMDB season zero (specials) is supported. Episode membership is checked against the fetched season in the episode row handler; the episode's own ID is never substituted for its parent series ID.

Once a licensed source has been verified, configure it in `PLAYBACK_SERVERS`, implement its `supports` predicate and URL builder, and set the existing viewport's `sampleOnly` prop to false. The existing modal/player container remains usable. Never enable an entire provider catalog based on a single unrelated clip. Signed URLs and private credentials belong on the backend, not in React source.

`useStreaming` supplies explicit start/close, code-based `switchServer`, initialization/buffering timeouts, failure fallback, native event bindings and localStorage resume isolated by media type, title ID, season, episode and source. Native controls provide play/pause, mute/volume, seeking and fullscreen when the browser supports them. No autoplay is forced. Subtitles require authorized text tracks, and quality selection requires supplied renditions or a documented provider API. No HLS/DASH library was added. Cross-origin iframe controls/resume cannot be managed without a documented and validated provider messaging API.

## Files

Existing app files modified:

- `src/components/Moviedetails.js`: reuse Watch modal for the sample; reset Watch state on title changes.
- `src/components/TVShowDetails.js`: reuse modal, select actual season/episode rows and reset selection on series changes.

Added/maintained streaming files:

- `src/components/StreamingPlayback.js` and `StreamingPlayback.test.js`.
- `src/streaming/testVideoSource.js`.
- `src/streaming/streamingServers.js` and `streamingServers.test.js`.
- `src/hooks/useStreaming.js` and `useStreaming.test.js`.

Reproducible QA tools:

- `scripts/streaming-playback-check.cjs` and `scripts/streaming-qa.jsx`: isolated hook/sample runner.
- `scripts/verify-streaming-browser.cjs`: actual media, pause, resume, fullscreen, switching and error checks.
- `scripts/serve-build.cjs`: loopback-only production build server.
- `scripts/verify-watch-browser.cjs`: production Watch/TV integration, routing, error and layout checks.
- `scripts/check-streaming-providers.cjs`: provider HTTP/redirect/framing-header probes.
- `STREAMING_INTEGRATION.md`: this report.

No application package dependency, package lock, CSS file, Tailwind setting, API credential or authentication configuration was changed. Playwright was installed only into a temporary test-tool directory and used the installed Chrome/Edge executables. The ignored `build/` directory was regenerated. Existing `App.test.js` still has its unrelated starter-test/Router failure; the focused streaming suites pass. Jest's reported open timer was traced to the existing CRA Babel plugin warning, not a streaming timer leak.

## Reproduce locally

Run from `C:\react-site\movie-web`. In one PowerShell terminal:

```powershell
node scripts/streaming-playback-check.cjs
```

Open `http://127.0.0.1:4174/` for manual tests. Use Load sample, Play, Pause, Fullscreen, Switch test source and Trigger real media error. Confirm advancing time and moving frames, not just a loaded element. Trigger error on source A to verify fallback, then on B to verify terminal failure. Toggle the movie/TV metadata fixture to verify selection resets. Close/reopen midway to verify resume. This page is not part of the product UI.

For automated tests, install Playwright into temporary tooling (not the app):

```powershell
$qaTools = Join-Path $env:TEMP 'moviesync-browser-tools'
npm install --prefix $qaTools --no-save --no-package-lock playwright
node scripts/verify-streaming-browser.cjs
```

Scripts use installed Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`. Override `CHROME_PATH` for another browser executable and `PLAYWRIGHT_MODULE` for another Playwright module location. Edge was tested using:

```powershell
$env:CHROME_PATH='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
node scripts/verify-streaming-browser.cjs
Remove-Item Env:CHROME_PATH
```

To test the product build, build it and run the static server in another terminal:

```powershell
npm run build
node scripts/serve-build.cjs
```

Then run:

```powershell
node scripts/verify-watch-browser.cjs
node scripts/check-streaming-providers.cjs
$env:CI='true'
npm test -- --watchAll=false --runInBand --runTestsByPath src/streaming/streamingServers.test.js src/hooks/useStreaming.test.js src/components/StreamingPlayback.test.js
```

For a live application check, open `http://127.0.0.1:4175/moviedetails/550` or `/tv/1399`; these require working live TMDB metadata and the app's normal services. Click Where to Watch, then the native play button. The disclaimer must remain visible. Stop the servers with Ctrl+C. For physical-device testing, use your established secure development forwarding; do not publicly expose the QA server.

## Mobile rotation and fullscreen

The streaming modal now recognizes phone portrait and short, touch-device landscape viewports. Landscape keeps the server control and close button accessible, limits the inline viewport to available height, and retains page scroll locking during rotation. Rotation does not remount the selected source. Fullscreen styling fills the viewport for the wrapper, native video, and embedded iframe; native video uses `object-fit: contain` to preserve its proportions.

Run `node scripts/verify-mobile-fullscreen-browser.cjs` against the production QA server above. It replaces all four provider documents with controlled cross-origin fixtures containing MDN's CC0 flower clip. Actual clip playback, fullscreen entry/exit, portrait-to-landscape sizing, and source retention passed in Chrome mobile emulation. This is not evidence of movie playback from any live external provider.

Rotate a physical phone with auto-rotate enabled, enter and exit fullscreen using the provider's own control, and test returning to portrait in Android Chrome and iPhone Safari. iOS native media fullscreen and each provider's internal player remain browser/provider controlled. The application does not force orientation or bypass fullscreen permissions, iframe restrictions, or provider security. Physical-device and Safari verification remain outstanding.

Live embed diagnostics on 2026-10-23 used Big Buck Bunny (TMDB 10378), with Blender Foundation attribution and a license link. VidLink reported missing content; Videasy redirected to `player.videasy.to` and exposed no video in the observation window; Vidfast returned 403 and refused framing with `X-Frame-Options: sameorigin`; 111Movies redirected to a player reporting the title unavailable. None verified live provider playback. These availability/embedding results are separate from the successful controlled fullscreen checks and do not establish authorization for other titles.

## Availability catalog and restored Watch Now behavior

The automatic release-date/source-availability gate was undone at the user's request. Movie details always offer Watch Now again; the catalog does not hide the button or restrict its servers. TV controls are unchanged.

The catalog can now be managed at http://127.0.0.1:8000/admin/streaming.php using the existing PHP admin login. The dashboard's Streaming Availability tab links to this editor. Records are separate from public-domain download entries and are keyed by TMDB movie ID. Add/edit a title, choose available or unavailable, choose provider IDs, and set a confirmation lifetime (15 minutes to 24 hours). Marking a title available requires explicit acknowledgement that its selected sources were checked. Saving does not automatically test a provider or establish content rights.

Authenticated, CSRF-protected POST and DELETE requests update public/streaming-availability.json through a locked atomic write. GET /api/streaming-availability.php exposes the current catalog with no-store caching and the same movies-object format. The optional availability hook now reads this backend endpoint, but is deliberately not connected to Watch Now visibility. Deploy the PHP API with the frontend, or set REACT_APP_BACKEND_URL / REACT_APP_STREAM_AVAILABILITY_URL if they are hosted separately. The local development API defaults to http://127.0.0.1:8000.

Start the loopback-only backend from PowerShell with ./scripts/start-backend.ps1. It uses a dedicated temporary PHP session directory so it does not depend on XAMPP's protected session folder. PHP and the configured MySQL database must be available. The script is a local development server, not a public hosting configuration.

PHP syntax checks and real browser login/catalog create-edit-delete checks passed. Tests used an ephemeral QA admin and synthetic unavailable catalog record, then removed both. Existing admin credentials and movie records were left unchanged. Unauthorized writes, invalid CSRF tokens, unknown servers, and invalid lifetimes were rejected. The README's default password did not authenticate the existing account; use the owner's current credentials.

Run php scripts/verify-admin-catalog.php for the isolated-account integration test, with the local backend running. Run node scripts/verify-movie-availability-browser.cjs against the production QA server to verify that Watch Now remains visible regardless of release/availability metadata.

## Movie identity during navigation

Movie details now abort obsolete requests and ignore late responses after a title change. The old player is removed while the new selection loads, metadata must match the route's TMDB movie ID, and the player uses that validated metadata ID. The modal is keyed per movie. This prevents a previous title's details from being paired with the new movie's stream URL.

`src/components/MovieIdentity.test.js` reproduces delayed old responses, an open player during navigation, and mismatched metadata. `node scripts/verify-movie-identity-browser.cjs` checks rapid navigation and all four server URLs at desktop/mobile sizes using controlled fixtures. Those checks passed; they do not establish the identity of the video a third-party provider actually serves. Investigating a provider-side mismatch still requires the affected movie title/TMDB ID and server. Cross-origin player content cannot be independently validated by the application from an iframe load or claimed playback message alone.
