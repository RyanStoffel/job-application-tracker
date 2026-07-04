# AGENTS.md

Repo-specific implementation guidance lives in [`docs/AGENTS.md`](docs/AGENTS.md).

## Must-keep rules

- Keep `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md`, `web/lib/types.ts`, and `extension/src/shared/types.ts` in sync whenever the shared contract changes.
- Preserve the current status taxonomy: `saved`, `applied`, `interviewing`, `rejected`, `ghosted`, `offer`.
- Route status changes through `POST /api/applications/{id}/status` so history remains append-only.
- Treat LinkedIn selectors as unstable and prefer additive fallback chains over brittle rewrites.
- Keep browser-extension auth in the background worker, not in content scripts.

Read the full guide before making cross-cutting changes.
