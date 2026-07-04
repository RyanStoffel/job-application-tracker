-- The job-description snapshot feature was removed: users can follow
-- sourceUrl back to the original listing instead. Capturing/formatting it
-- reliably across arbitrary LinkedIn layouts proved too brittle to be worth
-- keeping (see docs/PROJECT_PLAN.md Phase 1 follow-up notes).
ALTER TABLE job_applications
    DROP COLUMN description_snapshot;
