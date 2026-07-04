# Roadmap

The MVP is in place: email/password auth, manual job-application CRUD, status
history, notes, dashboard and home views, a Spring Boot API, PostgreSQL
storage, and a browser extension that captures LinkedIn listings — plus,
since Phase 1 and Phase 2 of `docs/PROJECT_PLAN.md`, a canonical parsed-
listing schema with structured location/salary/logo capture, duplicate
detection, a generic fallback parser, and dedicated Greenhouse/Lever/
Workday/Ashby parsers.

The active backlog is tracked in the GitHub Project board:

- **Board:** <https://github.com/users/RyanStoffel/projects/2>

## Near-term roadmap

### 1. Parsing and capture quality

Improve what gets saved at application-creation time so the tracker becomes a
reliable source of truth instead of just a title/company bookmark.

Primary work:

- define a canonical parsed listing schema
- capture location consistently
- capture salary ranges and normalized compensation data
- auto-fill the applied-on date
- extract company logos when the source makes them available
- add a metadata-based fallback parser for unsupported sites
- detect duplicates and likely reposted roles

## 2. Broader job-site support (done)

Dedicated parsers for the major hosted ATS/job-board providers:

- Greenhouse
- Lever
- Workday
- Ashby

All four write into the same canonical parsed-listing schema so the UI and
API stay source-agnostic (they POST to the same generic
`/api/integrations/capture` endpoint as the fallback parser, tagged
`source=other` — there's no per-platform source value). All four are
confirmed working: Greenhouse/Lever/Ashby's primary extraction path was
verified against real live postings, and Workday was confirmed with a live
browser pass against real tenants (see `extension/README.md` "ATS parser
verification status").

## 3. Workflow intelligence

Deepen the application lifecycle model so the app can drive reminders and
analytics from real history:

- durable stage-history tracking with timestamps
- follow-up reminders
- ghosted detection
- funnel analytics and Sankey-style stage flow visualization

## 4. Email-driven automation

Use Gmail as a signal source to reduce manual tracking work:

- Gmail OAuth connection flow
- ingestion of job-related email threads
- matching recruiter emails back to tracked applications
- high-confidence automatic status updates

This work should remain auditable: automatic updates need a recorded source and
should not fire on ambiguous matches.

## 5. Candidate prep and document context

Make each application more useful once interviews start:

- track which resume and cover-letter versions were sent
- add an interview-prep mode on the application detail page

## 6. Analytics, motivation, and export

Add user-facing insight layers once the underlying capture and workflow data is
strong enough:

- activity heatmap
- weekly goals and streaks
- salary scatter plot
- CSV export

## 7. Notifications foundation

Design a shared notification event model that supports:

- browser reminders now
- extension/browser alerts for recruiter activity
- a future iOS app with push notifications later

The notification domain should be delivery-channel agnostic from the start.

## Sequencing guidance

Recommended execution order:

1. parsing foundation and data model extensions
2. site-specific extractors
3. workflow history and reminder primitives
4. analytics built on top of that history
5. Gmail integration and automation
6. document/prep UX
7. notifications and future mobile support

That order keeps the later intelligence features grounded in reliable stored
data instead of speculative heuristics.
