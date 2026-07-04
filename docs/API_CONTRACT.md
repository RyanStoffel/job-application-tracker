# API Contract

This document describes the current HTTP contract shared by the web app, API,
and browser extension.

## Base URL

- local development: `http://localhost:8080/api`

## Auth model

- Authentication uses `Authorization: Bearer <jwt>`.
- All endpoints require auth except:
  - `POST /auth/signup`
  - `POST /auth/login`

## Standard error shape

All non-2xx responses should use:

```json
{
  "message": "Human-readable error",
  "errors": {
    "fieldName": "Validation detail"
  }
}
```

`errors` is optional and is mainly used for validation failures.

## Shared enums

### Status

- `saved`
- `applied`
- `interviewing`
- `rejected`
- `ghosted`
- `offer`

### Source

- `manual`
- `linkedin`
- `other` (generic fallback and dedicated ATS capture — Greenhouse, Lever,
  Workday, Ashby all POST here too; see `POST /integrations/capture`)

### SalaryPeriod

- `yearly`
- `monthly`
- `weekly`
- `hourly`

## Shared object shapes

### User

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "Ryan",
  "avatarUrl": null,
  "createdAt": "2026-07-03T20:00:00Z"
}
```

### Application

```json
{
  "id": "uuid",
  "source": "manual",
  "sourceUrl": "https://www.linkedin.com/jobs/view/123",
  "companyName": "Acme",
  "jobTitle": "Software Engineer",
  "locationText": "Los Angeles, CA",
  "salaryText": "$140,000 - $180,000",
  "appliedAt": "2026-07-03T00:00:00Z",
  "postedAt": "2026-06-30T00:00:00Z",
  "locationCity": "Los Angeles",
  "locationRegion": "CA",
  "locationCountry": "United States",
  "isRemote": null,
  "salaryMin": 140000,
  "salaryMax": 180000,
  "salaryCurrency": "USD",
  "salaryPeriod": "yearly",
  "companyLogoUrl": null,
  "duplicateOfId": null,
  "currentStatus": "applied",
  "createdAt": "2026-07-03T20:00:00Z",
  "updatedAt": "2026-07-03T20:00:00Z"
}
```

Notes:

- `appliedAt` and `postedAt` are distinct: `postedAt` is the listing's
  original posting date (when supplied by a capture source); `appliedAt` is
  when the user applied, and is auto-filled (see the create/status-update
  endpoints below) rather than left for the client to compute.
- `locationCity`/`locationRegion`/`locationCountry`/`isRemote` and
  `salaryMin`/`salaryMax`/`salaryCurrency`/`salaryPeriod` are structured
  fields. When a request doesn't supply them explicitly, the API derives
  them best-effort from `locationText`/`salaryText`; the raw text fields
  remain the source of truth for display and are never overwritten by the
  derived structured values.
- `duplicateOfId` is non-null when this application looks like a repost of
  (or duplicate of) another application already tracked for this user — a
  case-insensitive/trimmed company+title match. It's informational only:
  it never blocks or merges a create/ingest, it just points at the other
  record.
- Any field left absent by a `null` value is omitted from the JSON response
  (the API uses `non_null` property inclusion).

### Note

```json
{
  "id": "uuid",
  "content": "Need to prepare for system design round.",
  "createdAt": "2026-07-03T20:00:00Z",
  "updatedAt": "2026-07-03T20:05:00Z"
}
```

### StatusEvent

```json
{
  "id": "uuid",
  "status": "interviewing",
  "note": "Recruiter scheduled a phone screen.",
  "changedAt": "2026-07-03T20:10:00Z"
}
```

### ApplicationDetail

`ApplicationDetail` is:

- all `Application` fields
- `notes: Note[]`
- `statusHistory: StatusEvent[]`

### StatsSummary

```json
{
  "total": 12,
  "byStatus": {
    "saved": 1,
    "applied": 6,
    "interviewing": 3,
    "rejected": 1,
    "ghosted": 1,
    "offer": 0
  },
  "recentActivity": [
    {
      "id": "uuid",
      "status": "interviewing",
      "note": null,
      "changedAt": "2026-07-03T20:10:00Z",
      "applicationId": "uuid",
      "companyName": "Acme",
      "jobTitle": "Software Engineer"
    }
  ]
}
```

## Endpoints

### POST `/auth/signup`

Creates a user and returns an auth payload.

Request:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "Ryan"
}
```

Response: `201 Created`

```json
{
  "user": { "id": "uuid", "email": "user@example.com", "displayName": "Ryan", "avatarUrl": null, "createdAt": "2026-07-03T20:00:00Z" },
  "token": "jwt"
}
```

Validation:

- `email` must be a valid email address
- `password` must be at least 8 characters
- `displayName` must not be blank

### POST `/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response: `200 OK`

```json
{
  "user": { "id": "uuid", "email": "user@example.com", "displayName": "Ryan", "avatarUrl": null, "createdAt": "2026-07-03T20:00:00Z" },
  "token": "jwt"
}
```

### GET `/auth/me`

Response:

```json
{
  "user": { "id": "uuid", "email": "user@example.com", "displayName": "Ryan", "avatarUrl": null, "createdAt": "2026-07-03T20:00:00Z" }
}
```

### GET `/applications`

Query params:

- `status` - optional status filter
- `q` - optional text search
- `sort` - one of:
  - `createdAt`
  - `-createdAt`
  - `companyName`
  - `-companyName`
  - `currentStatus`

Response: `Application[]`

### POST `/applications`

Creates a manual application.

Request:

```json
{
  "companyName": "Acme",
  "jobTitle": "Software Engineer",
  "sourceUrl": "https://example.com/jobs/123",
  "locationText": "Los Angeles, CA",
  "salaryText": "$140,000 - $180,000",
  "appliedAt": "2026-07-03T00:00:00Z",
  "postedAt": null,
  "locationCity": null,
  "locationRegion": null,
  "locationCountry": null,
  "isRemote": null,
  "salaryMin": null,
  "salaryMax": null,
  "salaryCurrency": null,
  "salaryPeriod": null,
  "companyLogoUrl": null,
  "currentStatus": "saved"
}
```

Response: `201 Created` with `Application`

Rules:

- `companyName` is required
- `jobTitle` is required
- `currentStatus` is required
- all other fields shown above are optional
- create flows should seed initial status history
- `appliedAt` auto-fill: if omitted, it's left `null` when `currentStatus` is
  `saved`, and set to the current time for any other starting status
- structured location/salary fields are derived from the raw text when not
  explicitly supplied (see the `Application` notes above)
- `duplicateOfId` is computed server-side; it's not a request field

### GET `/applications/{id}`

Response: `ApplicationDetail`

### PATCH `/applications/{id}`

Partial update for editable fields:

- `companyName`
- `jobTitle`
- `sourceUrl`
- `locationText`
- `salaryText`
- `appliedAt`
- `postedAt`
- `locationCity`, `locationRegion`, `locationCountry`, `isRemote`
- `salaryMin`, `salaryMax`, `salaryCurrency`, `salaryPeriod`
- `companyLogoUrl`

Response: `200 OK` with `Application`

Current MVP behavior:

- `null` is treated as "no change", not "clear this field"
- `currentStatus` is intentionally not accepted here
- if `locationText`/`salaryText` changes without an explicit structured
  override in the same request, the structured fields are re-derived from
  the new raw text so they don't go stale

### DELETE `/applications/{id}`

Response: `204 No Content`

### POST `/applications/{id}/status`

Changes the current status and appends a status-history event.

Request:

```json
{
  "status": "interviewing",
  "note": "Phone screen scheduled."
}
```

Response: `200 OK` with `ApplicationDetail`

Behavior:

- transitioning into `applied` auto-fills `appliedAt` to the current time if
  it's still unset — the common "mark saved job as applied" flow shouldn't
  require manually entering a date

### POST `/applications/{applicationId}/notes`

Request:

```json
{
  "content": "Need to review the saved JD before the recruiter call."
}
```

Response: `201 Created` with `Note`

### PATCH `/applications/{applicationId}/notes/{noteId}`

Request:

```json
{
  "content": "Updated note content."
}
```

Response: `200 OK` with `Note`

### DELETE `/applications/{applicationId}/notes/{noteId}`

Response: `204 No Content`

### GET `/stats/summary`

Response: `200 OK` with `StatsSummary`

### POST `/integrations/linkedin`

Used by the browser extension to create or dedupe an application from a
captured LinkedIn listing.

Request:

```json
{
  "sourceUrl": "https://www.linkedin.com/jobs/view/123",
  "companyName": "Acme",
  "jobTitle": "Software Engineer",
  "locationText": "Los Angeles, CA",
  "salaryText": "$140,000 - $180,000",
  "postedAt": "2026-07-03T00:00:00Z",
  "companyLogoUrl": null
}
```

Responses:

- `201 Created` with `Application` when a new record is created
- `200 OK` with `Application` when the canonicalized URL already exists for the user

Behavior:

- the API canonicalizes `sourceUrl` before dedupe
- new ingested records are created as `source=linkedin`
- new ingested records default to `currentStatus=applied`
- `appliedAt` is auto-filled to the capture time (this endpoint doesn't
  accept an explicit `appliedAt`); `postedAt` is stored separately as the
  listing's own posting date
- structured location/salary fields are derived from `locationText`/`salaryText`
- `duplicateOfId` is set if this looks like a repost of an application
  already tracked for this user (see the `Application` notes above) — this
  never blocks creation

### POST `/integrations/capture`

Shared capture endpoint for every non-LinkedIn extension parser: the
dedicated Greenhouse/Lever/Workday/Ashby parsers (see docs/ARCHITECTURE.md
"Dedicated ATS capture flow") and the generic JSON-LD/heuristic fallback for
unsupported/unrecognized job sites ("Generic capture flow"). Same request/
response shape and behavior as `POST /integrations/linkedin` above, except
new records are created as `source=other` instead of `source=linkedin` —
there's no per-ATS source value, since all of these write into the same
canonical shape.

## Ownership semantics

Application and note lookups are user-scoped. Records that do not belong to the
authenticated user should behave as not found.
