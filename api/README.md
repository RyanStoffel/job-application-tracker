# Job Tracker API

Spring Boot 3 (Java 21) REST API implementing [docs/API_CONTRACT.md](../docs/API_CONTRACT.md)
against the schema in [docs/DATA_MODEL.md](../docs/DATA_MODEL.md).

## Prerequisites

- Java 21
- Maven (or use your IDE's bundled Maven)
- Docker (for the PostgreSQL container defined in the repo root `docker-compose.yml`)

## Running locally

From the **repo root**:

```bash
docker compose up -d
```

This starts PostgreSQL (db `jobtracker`, user/pass `jobtracker`/`jobtracker`, port `5432`).

From **this directory** (`api/`):

```bash
mvn spring-boot:run
```

The API starts on `http://localhost:8080`. Flyway runs the migration in
`src/main/resources/db/migration` automatically on startup.

## Running tests

```bash
mvn test
```

Tests use an H2 in-memory database (`spring.profiles.active=test`, see
`src/test/resources/application-test.yml`) with Hibernate's
`ddl-auto: create-drop` schema generation rather than the production
Flyway/Postgres migration. Docker/Testcontainers wasn't reliably available in
the environment this was built in, so H2 was chosen as the pragmatic MVP
fallback described in the project brief. This means the tests exercise the
JPA entity mappings, service logic, and HTTP layer end-to-end, but do **not**
verify the literal Postgres migration SQL (types, `CHECK` constraints,
`gen_random_uuid()`) executes cleanly against real Postgres — that's
verified manually / at deploy time via `docker compose up -d` +
`mvn spring-boot:run`. If greater fidelity is wanted later, swap the test
profile to Testcontainers' `postgres` module with no changes needed to the
production code.

Included tests (`src/test/java/com/jobtracker/api/`):
- `AuthFlowTest` — signup, login, `/auth/me`, duplicate-email conflict, bad-password rejection.
- `ApplicationCrudTest` — create/list/get/patch/delete an application, plus auth and validation error cases.
- `StatusTransitionTest` — verifies a status change both appends an `application_status_events` row and updates `job_applications.current_status`, in one transaction.
- `IntegrationsDedupeTest` — posts the same LinkedIn listing twice with different query strings/fragment, verifying URL canonicalization dedupes to a single record (`201` then `200`, same id).

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_PORT` | `8080` | HTTP port |
| `DB_HOST` | `localhost` | Postgres host |
| `DB_PORT` | `5432` | Postgres port |
| `DB_NAME` | `jobtracker` | Postgres database name |
| `DB_USER` | `jobtracker` | Postgres user |
| `DB_PASSWORD` | `jobtracker` | Postgres password |
| `JWT_SECRET` | dev-only insecure default | HMAC signing secret for JWTs. **Always override outside local dev.** |
| `JWT_EXPIRATION_MINUTES` | `10080` (7 days) | JWT token lifetime |
| `WEB_APP_ORIGIN` | `http://localhost:3000` | Allowed CORS origin for the Next.js web app |

## Design notes / deviations from a literal reading of the docs

- **`auth_identities` table exists but isn't populated yet.** This MVP only
  implements email/password auth; the password hash is stored directly on
  `users.password_hash` (as the docs permit). The `auth_identities` table
  is created by the Flyway migration so the schema doesn't need a breaking
  change when Phase 2 (OAuth) lands, but there's no JPA entity or code path
  writing to it yet.
- **IDs are generated in the JVM**, via JPA's `GenerationType.UUID` (not the
  Postgres-side `gen_random_uuid()` default), so behavior is identical
  against Postgres and the H2 test database. The `gen_random_uuid()` column
  default is still declared in the migration as a safety net for any direct
  SQL inserts.
- **PATCH `/api/applications/{id}` treats `null` as "no change"**, not
  "clear this field" — a field omitted from the JSON body and a field
  explicitly set to `null` are indistinguishable in the current
  implementation. A tri-state wrapper (e.g. `JsonNullable<T>`) would be a
  natural follow-up if clients need to explicitly null out optional fields
  like `salaryText`.
- **LinkedIn ingest `postedAt` is mapped into `appliedAt`.** The contract's
  ingestion payload has a `postedAt` field but the `Application` model has
  no `postedAt` column — only `appliedAt`. Since there's no better signal
  for when the user applied, `postedAt` (if present) is used to populate
  `appliedAt` on newly created records. This is a judgment call, not
  specified explicitly in the contract.
- **An initial `application_status_events` row is written on creation**
  (manual create and LinkedIn ingest), seeding the status history with the
  record's starting status, not just on subsequent transitions — this
  keeps `statusHistory` a complete audit trail from the moment a record
  exists, consistent with the "audit trail" principle in `docs/AGENTS.md`.
- **Ownership checks return `404`, not `403`,** for another user's
  application/note, to avoid leaking existence of records that don't belong
  to the caller.
- **Unknown JSON fields are ignored** (`spring.jackson.deserialization.fail-on-unknown-properties: false`)
  rather than rejected — e.g. a client accidentally sending `currentStatus`
  in a PATCH body won't cause a `400`, it's just ignored (status changes
  must go through the dedicated status endpoint).
- **Validation errors return `400`** (not `422`) with the contract's
  `{ "message", "errors" }` shape; the contract lists `422` as one of the
  possible standard codes across the whole API but doesn't mandate it for
  any specific endpoint.
