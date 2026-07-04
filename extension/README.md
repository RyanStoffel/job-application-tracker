# Job Application Tracker — Browser Extension

Manifest V3 extension (Chrome + Firefox) that detects LinkedIn job listing
pages and offers a one-click "Add to tracker?" prompt, per
`docs/PROJECT_PLAN.md` and `docs/ARCHITECTURE.md`.

## Build

```sh
cd extension
npm install
npm run build
```

This type-checks with `tsc --noEmit` and then bundles with esbuild into
`extension/dist/`. `npm run watch` runs the same bundler in watch mode
(no type-check gate, for faster iteration).

Output layout:

```
dist/
  manifest.json
  content/linkedin-detector.js
  content/ats-detector.js
  content/generic-detector.js
  content/cross-site-toast.js
  background/sync.js
  popup/popup.html
  popup/popup.js
```

## Load unpacked

### Chrome / Chromium / Edge / Brave
1. Run the build (above).
2. Go to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select `extension/dist`.

### Firefox
Firefox supports Manifest V3 extensions; `manifest.json` includes a
`browser_specific_settings.gecko` block for this.
1. Run the build (above).
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select any file inside
   `extension/dist` (e.g. `manifest.json`).
4. Note: temporary add-ons are removed when Firefox restarts; reload them
   the same way after each restart.

## Configuration

The API origin is a single constant: `extension/src/shared/config.ts`
(`API_BASE_ORIGIN`, default `http://localhost:8080` for local dev). If you
change it, you **must** also update the matching entry in
`extension/manifest.json` under `host_permissions` — Manifest V3 requires
the API's origin to be explicitly granted there, or the background service
worker's `fetch()` calls to the API will be blocked by the browser. See
`docs/API_CONTRACT.md` ("CORS / extension access") for why the extension
talks to the API directly (via `host_permissions`) instead of going through
a CORS-mediated request from a page context.

## How it works

- **`content/linkedin-detector`** — runs on `https://www.linkedin.com/jobs/view/*`,
  `/jobs/search/*`, `/jobs/search-results/*`, and `/jobs/collections/*`.
  Extracts job title, company, canonical URL, location, and salary text (when
  available), and shows an inline "Add to tracker?" banner with **Add**,
  **Edit**, and **Dismiss**. Edit opens an inline form (title/company/
  location/salary) so you can correct the auto-extracted fields before they're
  saved. Because LinkedIn's job search/collections pages are a single-page app
  (selecting a job card updates the URL — often via a `currentJobId` query
  param — and swaps the detail panel without a full page load), the content
  script patches `history.pushState`/`replaceState`, listens for `popstate`,
  and runs a debounced `MutationObserver` as a backstop, re-running extraction
  whenever the effective listing changes.
- **Apply-click auto-capture** — a capture-phase `click` listener watches for
  anything that looks like LinkedIn's Apply/Easy Apply control (matched by
  visible text/`aria-label`, not CSS class — see the big comment in
  `linkedin-detector.ts`, since this LinkedIn build uses hashed/atomic CSS
  classes with no stable names). When it fires, the current listing is added
  automatically (no confirmation banner — clicking Apply *is* the
  confirmation), with a small transient "Apply detected — added to tracker"
  toast. This is unverified against the live Apply button the same way the
  extraction selectors originally were; watch the console for `"apply-like
  control clicked"` to see whether it's firing correctly, or not firing at
  all, and tune `APPLY_TEXT_PATTERN`/`APPLY_ARIA_LABEL_PATTERN` accordingly.
- **`content/cross-site-toast`** — a second, much smaller content script
  matched against `<all_urls>` (**not** just linkedin.com), because
  external Apply links open the employer's own site in a brand new tab,
  which `content/linkedin-detector.ts` has no access to. This script does
  nothing on its own; it just waits for a `SHOW_SAVED_TOAST` message from
  the background worker and renders the same toast style there. This is why
  the extension now requests the broader "read and change all your data on
  all websites" permission — Chrome will call this out explicitly at
  install/update. `background/sync.ts` is responsible for figuring out
  *which* tab is the right one to message (see the big comment there): the
  new tab opens natively and near-instantly on click, while the POST to our
  API takes real network time, so which of "new tab appeared" and "add
  succeeded" happens first isn't guaranteed — it tracks both, keyed by the
  LinkedIn tab that had the Apply click, and delivers as soon as it has
  both a destination tab and a confirmed success.
- **`content/ats-detector`** + **`content/ats/*-selectors`** — dedicated
  parsers for Greenhouse (`boards.greenhouse.io`/`job-boards.greenhouse.io`),
  Lever (`jobs.lever.co`), Workday (`*.myworkdayjobs.com`), and Ashby
  (`jobs.ashbyhq.com`) — the Phase 2 "source coverage" deliverables. The
  entry point picks the right extractor by hostname; manifest.json scopes
  its `matches` to exactly these four domains and excludes them from the
  generic fallback below so only one detector ever runs per page. Like the
  generic fallback, these always show the confirm banner (no Apply-click
  auto-capture) and POST to `POST /api/integrations/capture`
  (`source=other`) — see "ATS parser verification status" below for how
  confident each one is.
- **`content/capture-runtime`** — the detect/confirm/send state machine
  shared by `content/generic-detector` and `content/ats-detector` (prompt
  handlers, per-tab dedupe, mutation-debounced re-detection). Factored out
  once so the four ATS parsers and the generic fallback don't each
  reimplement the same wiring; only the extraction function and the
  `source` tag passed to the background worker differ per caller.
- **`content/generic-detector`** + **`content/generic-selectors`** — the
  last-resort fallback parser for job postings on any site that isn't
  LinkedIn and doesn't have a dedicated parser (anything other than the five
  sources above). Runs on `<all_urls>` (excluding linkedin.com and the four
  ATS domains, which the dedicated flows above already cover), but does a
  cheap `looksLikeJobPosting()` check first — a schema.org `JobPosting`
  JSON-LD block, or a job-shaped URL path plus a title signal — and bails
  immediately otherwise, so it's inert on the vast majority of pages it's
  injected into. Shares JSON-LD parsing helpers with `content/selectors.ts`
  and the ATS parsers via `content/json-ld.ts`.
- **`content/selectors`** — the actual DOM-scraping logic. Tries, in order:
  1. a `application/ld+json` `JobPosting` block, if LinkedIn includes one;
  2. `<meta>` tags (e.g. `og:title`) as a looser fallback;
  3. a prioritized chain of CSS selectors against the visible DOM.

  Extraction never throws — if the minimum required fields (title, company,
  URL) can't be found, the function returns `null` and no prompt is shown.
- **`content/prompt`** — renders the banner inside a Shadow DOM host so
  LinkedIn's page styles can't interfere with it (and vice versa).
- **`background/sync`** — the service worker. Holds the auth JWT
  (`chrome.storage.local`), receives `ADD_LISTING` messages from the content
  script, and POSTs to `POST /api/integrations/linkedin` with the bearer
  token. On a `401` it clears the stored token and tells the content script
  to show a "please log in" state instead of failing silently.
- **`popup`** — email/password login form (calls `POST /api/auth/login`)
  when logged out; shows the current user + a logout button when logged in.
  Both states read/write `chrome.storage.local` directly.
- **`shared`** — types mirrored from `docs/API_CONTRACT.md`, the API client
  (`fetch` wrappers), storage helpers, canonical URL normalization, and the
  content-script/background message contract.

### Per-tab-session dedupe of prompts

The content script keeps an in-memory `Set` of canonical listing URLs the
user already added or dismissed during the current page/tab session (module
state persists for the lifetime of the content script instance, i.e. until
the tab loads a fresh document). This is intentionally simple and avoids
needing `chrome.storage.session` access-level plumbing for content scripts;
it satisfies "don't re-prompt for the same listing while the user stays on
the page" without persisting anything across tabs or restarts.

## ⚠️ LinkedIn selectors are unstable — read before touching production

This extension was built in an environment **without** the ability to
browse live LinkedIn pages. Every CSS selector in
`extension/src/content/selectors.ts` (`TITLE_SELECTORS`,
`COMPANY_SELECTORS`, `LOCATION_SELECTORS`, `SALARY_SELECTORS`,
`DETAIL_PANEL_SELECTORS` in `linkedin-detector.ts`) is a best-effort guess
based on publicly documented/observed LinkedIn markup patterns, **not**
verified against the current live site. Per `docs/AGENTS.md` ("Notes for
Extension Work: treat LinkedIn parsing selectors as unstable"), expect to:

1. Load the unpacked extension against real `linkedin.com/jobs/...` pages.
2. Open devtools and confirm which selectors actually match today's DOM.
3. Update the selector arrays (each is ordered primary-first,
   fallback-last — add/reorder entries, don't remove the fallback chain).
4. Re-test the JSON-LD path too — LinkedIn has historically included a
   `JobPosting` JSON-LD block on standalone `/jobs/view/` pages but it may
   not be present on search/collections detail panels; the meta-tag and DOM
   fallbacks exist for exactly that case.

Also unverified against the real site (expected, given the constraints of
this environment):
- The exact class names of the search/collections detail-panel container
  (`DETAIL_PANEL_SELECTORS`).
- The reliability of `currentJobId` as the query param LinkedIn uses to
  indicate the selected job in search results (`shared/url.ts`).
- End-to-end auth + POST flow against a running instance of the API in
  `api/` (this was built in parallel against the same `docs/API_CONTRACT.md`
  contract, but never run together).

## ATS parser verification status

All four dedicated ATS parsers are now confirmed working, either against
real fetched HTML or a live browser pass with the unpacked extension:

- **Greenhouse, Lever, Ashby** (`content/ats/{greenhouse,lever,ashby}-selectors.ts`)
  — checked against real, live postings (fetched 2026-07-04) before being
  written, so the primary extraction path (a `window.__remixContext` loader
  blob for Greenhouse, schema.org `JobPosting` JSON-LD for Lever and Ashby)
  reflects actual observed markup rather than a guess. The DOM fallback
  paths (used only when the primary source is missing) are less exercised
  than the primary path, but built from directly-observed class
  names/attributes rather than speculation.
- **Workday** (`content/ats/workday-selectors.ts`) — its `data-automation-id`
  selectors couldn't be confirmed by fetch alone (every Workday job page
  fetched during development was an unrendered SPA shell), so it shipped
  initially unverified; it was then manually confirmed 2026-07-04 against
  three real tenants (PayPal, Blue Origin, University of Maryland) with the
  unpacked extension loaded in a real browser — the confirm banner appeared
  and extracted title/company/location correctly on all three.

Note `data-automation-id="postedOn"` is still deliberately never wired into
`postedAt` even though the rest of the selectors are confirmed — it renders
a relative string ("Posted 30+ Days Ago"), not a parseable date, and the API
would reject/block the whole capture on an unparseable date (see the big
comment at the top of `workday-selectors.ts`).

## What's verified

- `npm run build` (`tsc --noEmit` + esbuild bundle) completes cleanly.
- The extension loads its manifest, background worker, content script, and
  popup HTML/JS as static artifacts in `dist/`.
- `npm test` (vitest + jsdom) covers the pure extraction logic — JSON-LD
  parsing, the generic fallback's detection gate, the LinkedIn SDUI
  title/company-collision recovery, and all four ATS parsers — against
  fixture HTML shaped like the real markup observed for
  Greenhouse/Lever/Ashby (see "ATS parser verification status" above). It
  does not, and cannot, exercise the actual browser extension APIs
  (`chrome.*`) or a real page's live DOM.
