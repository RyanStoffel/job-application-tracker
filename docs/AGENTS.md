# AGENTS.md

This document captures repo-specific implementation rules for humans and coding
agents working on the Job Application Tracker.

## Product intent

The app should make job-search tracking feel lightweight, trustworthy, and
useful:

- manual entry must stay fast
- automatic capture must be safe and auditable
- automation should assist, not silently mutate records on weak signals
- every future analytic should build on durable underlying data

## Repository map

- `web/` - Next.js frontend for auth, home, dashboard, and application detail
- `api/` - Spring Boot API for auth, CRUD, notes, status history, stats, and integrations
- `extension/` - Manifest V3 browser extension for job capture
- `docs/` - architecture, roadmap, project plan, API contract, and data model

## Cross-component contract rules

Any change to shared application data must update all of these together:

1. `docs/API_CONTRACT.md`
2. `docs/DATA_MODEL.md` if persistence changes
3. `web/lib/types.ts`
4. `extension/src/shared/types.ts` when the extension consumes the same data
5. the relevant API DTOs, tests, and README references

Do not let the code and docs drift on field names like `companyName`,
`sourceUrl`, `locationText`, `salaryText`, `appliedAt`, or `currentStatus`.

## Status taxonomy

The current canonical statuses are:

- `saved`
- `applied`
- `interviewing`
- `rejected`
- `ghosted`
- `offer`

Rules:

- `currentStatus` is the snapshot field on `job_applications`
- `application_status_events` is the append-only history
- status changes must go through `POST /api/applications/{id}/status`
- create flows should also seed an initial status-history event

If the product later expands to finer-grained stages, update the contract,
schema, analytics assumptions, and UI filters in one change.

## Extension-specific rules

### LinkedIn parsing is intentionally defensive

LinkedIn markup changes frequently. When working in `extension/src/content`:

- prefer ordered fallback selector arrays over single hard-coded selectors
- preserve JSON-LD and metadata fallbacks when adjusting DOM extraction
- avoid coupling to hashed class names unless there is no better option
- validate changes on multiple page shapes when possible: standalone job view,
  search results detail panel, and collections pages

### Background-worker security boundary

Keep bearer tokens in the background worker's storage layer:

- content scripts can extract listing data and show UI
- content scripts should not own auth tokens
- network writes to the API should flow through `background/sync.ts`

### Ingestion defaults

The extension's LinkedIn ingest path (`POST /integrations/linkedin`) and the
generic fallback ingest path (`POST /integrations/capture`) share the same
`IngestionService` and currently:

- canonicalize the listing URL before dedupe
- dedupe on `(user_id, source_url)`
- create new records as `source=linkedin` or `source=other` respectively
- seed new ingested records with `currentStatus=applied`
- auto-fill `appliedAt` to the capture time (not the listing's `postedAt`,
  which is stored separately)
- flag likely reposts via `duplicateOfId` without ever blocking creation

Preserve those behaviors unless the data model intentionally changes.

## Backend rules

- keep the API stateless with bearer-token auth
- preserve the standard error shape: `{ "message": string, "errors"?: { ... } }`
- prefer `404` over `403` for records the caller does not own
- avoid silent status updates that skip history
- keep dedupe logic idempotent for extension-driven ingest

## Frontend rules

- the web app is a direct API client; do not introduce incompatible field names
- keep auth hydration behavior aligned with `GET /api/auth/me`
- if a field becomes required in the API, update form UX and validation copy too

## Documentation sync checklist

When a feature changes the contract or plan:

1. update the relevant docs in `docs/`
2. update top-level README references if the setup or scope changed
3. update package-specific READMEs if local development steps changed
4. update roadmap and project plan when the priority order changes materially

## Current roadmap anchors

The authoritative planning docs are:

- [`ROADMAP.md`](ROADMAP.md)
- [`PROJECT_PLAN.md`](PROJECT_PLAN.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)

Use those docs as the source of truth for sequencing new work.
