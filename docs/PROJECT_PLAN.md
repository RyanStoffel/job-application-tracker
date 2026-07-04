# Project Plan

This plan turns the roadmap into a delivery sequence that keeps the data model,
API, extension, and UI aligned.

## Goals

1. Make captured applications richer and more durable.
2. Reduce manual tracking work safely.
3. Turn lifecycle data into reminders and analytics.
4. Keep future mobile and notification work unblocked.

## Phase 1 - Capture foundation (done)

Build the shared ingestion model first.

Deliverables:

- canonical parsed job-listing schema
- auto-filled `appliedAt` defaults
- structured location capture
- structured/raw salary capture
- company-logo extraction support
- generic fallback parser for unsupported sites
- duplicate/repost detection during capture (including re-detection on
  manual company/title edits, not just at capture time)

Not pursued: full job-description snapshot storage. Reliable extraction and
formatting proved too brittle across LinkedIn's layouts to be worth the
complexity; `sourceUrl` lets users jump back to the original listing instead.

Why first:

- every downstream feature depends on better application records
- site-specific parsers are easier once the target schema is stable
- analytics are only as good as the raw capture quality

## Phase 2 - Source coverage (done)

Expand beyond the current LinkedIn-first flow.

Deliverables:

- Greenhouse parser
- Lever parser
- Workday parser
- Ashby parser

All four share one dispatcher (`content/ats-detector.ts`) and the same
detect/confirm/send runtime as the generic fallback
(`content/capture-runtime.ts`); none get a distinct `source` value server-
side (all POST to `/api/integrations/capture` as `source=other`), per the
constraint below. Verified 2026-07-04: Greenhouse/Lever/Ashby against real
fetched postings, Workday with a live browser pass against real tenants
(PayPal, Blue Origin, University of Maryland) — see `extension/README.md`
"ATS parser verification status".

Constraints:

- all extractors must emit the same canonical shape
- unsupported fields should degrade gracefully rather than block saving

## Phase 3 - Workflow model

Turn the tracker from a CRUD app into a process tracker.

Deliverables:

- durable application stage history with timestamps
- reminder rules for follow-up prompts
- ghosted detection

Dependencies:

- capture foundation is complete
- status-history semantics are documented and consistent across manual and automated changes

## Phase 4 - Analytics

Use the workflow model to surface useful feedback.

Deliverables:

- conversion-rate calculations between stages
- time-to-response metrics
- funnel or Sankey visualization
- activity heatmap
- weekly goals
- salary insights charting

Dependencies:

- stage timestamps
- normalized status taxonomy
- compensation storage

## Phase 5 - Gmail automation

Reduce manual updates by treating recruiter email as a workflow signal.

Deliverables:

- Gmail OAuth connection and token management
- ingestion of relevant job-related emails
- message-to-application matching
- high-confidence automatic status updates

Guardrails:

- ambiguous matches should surface for review, not mutate records silently
- every automated update must preserve why it happened

## Phase 6 - Candidate context and export

Round out the product for actual interview and retrospective use.

Deliverables:

- resume/cover-letter version tracking per application
- interview-prep mode
- CSV export

## Phase 7 - Notifications and future mobile path

Design the notification domain before shipping multiple delivery channels.

Deliverables:

- shared notification event model
- browser/extension notification support
- future-compatible path for iOS push delivery

## Ongoing documentation tasks

When any phase lands:

- update `docs/API_CONTRACT.md` for contract changes
- update `docs/DATA_MODEL.md` for schema changes
- update `docs/ARCHITECTURE.md` when flows or trust boundaries move
- update `docs/ROADMAP.md` when priorities materially change
