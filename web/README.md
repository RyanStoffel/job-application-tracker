# Job Tracker — Web App

The Next.js frontend for the job application tracker: auth, a home stats
snapshot, a filterable dashboard, and a per-application detail view with
status history and notes.

## Prerequisites

- Node.js **20+** (Node 22 also works)
- The backend API running — see [`../api/README.md`](../api/README.md).
  This app is a pure client of that API; nothing here will load data
  without it running.

## Setup

```bash
cd web
npm install
```

Copy the env example and adjust if your API isn't on the default port:

```bash
cp .env.local.example .env.local
```

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080/api` | Base URL of the Spring Boot API (runs on port 8080 by default — see the API's own README). |

## Running

```bash
npm run dev
```

The app runs at `http://localhost:3000`. **The backend API must already be
running** (see `../api/README.md`) — the login/signup pages, dashboard,
home, and detail views all call it directly and will show an error state
if it isn't reachable.

## Building

```bash
npm run build
npm run start
```

## Project layout

- `app/` — routes (App Router): `/login`, `/signup`, `/home`, `/dashboard`,
  `/applications/[id]`
- `components/` — shared UI (status badges, layout shell, auth guard,
  applications table/forms, stats widgets)
- `lib/api.ts` — thin REST client; attaches the bearer token, centralizes
  error handling around the API's `{ message, errors? }` error shape
- `lib/auth-context.tsx` — React context + `useAuth()` hook; hydrates the
  session from `localStorage` + `GET /api/auth/me` on load
- `lib/types.ts` — TypeScript types mirroring `docs/API_CONTRACT.md`

## Auth model

Email/password only for this MVP (no OAuth). On login/signup the API
returns a JWT which is stored in `localStorage` and attached as
`Authorization: Bearer <token>` on every subsequent request. Route
protection is client-side: authenticated pages redirect to `/login` if no
valid session is found once auth resolves.
