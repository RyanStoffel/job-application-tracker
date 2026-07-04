# Job Application Tracker

A full-stack job application tracker: a Next.js web app, a Spring Boot API,
a PostgreSQL database, and a browser extension that detects LinkedIn job
listings and offers to add them to your tracker.

## Structure

- `web/` — Next.js frontend (dashboard, home snapshot, application detail, auth)
- `api/` — Spring Boot REST API (auth, applications, notes, stats, integrations)
- `extension/` — Manifest V3 browser extension (Chrome + Firefox)
- `docs/` — planning and reference docs:
  - [Roadmap](docs/ROADMAP.md)
  - [Project plan](docs/PROJECT_PLAN.md)
  - [Architecture](docs/ARCHITECTURE.md)
  - [API contract](docs/API_CONTRACT.md)
  - [Data model](docs/DATA_MODEL.md)
  - [Implementation guide](docs/AGENTS.md)

## Local development

1. Start PostgreSQL: `docker compose up -d`
2. Start the API: see [api/README.md](api/README.md)
3. Start the web app: see [web/README.md](web/README.md)
4. Load the extension: see [extension/README.md](extension/README.md)

## MVP scope

Email/password auth only (OAuth providers are a follow-up phase). Full CRUD
for job applications, status history, notes, a home stats snapshot, a
filterable dashboard, and LinkedIn listing capture via the extension.

## Roadmap and planning

- GitHub Project board: <https://github.com/users/RyanStoffel/projects/2>
- Product roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Delivery sequencing: [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)
