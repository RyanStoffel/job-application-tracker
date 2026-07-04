-- Phase 1 capture-foundation additions (see docs/PROJECT_PLAN.md).
--
-- `applied_at` previously doubled as "when the listing was posted" for
-- LinkedIn ingest, which was wrong. `posted_at` now separately stores the
-- listing's original posting date; `applied_at` is auto-filled at
-- capture/create/status-transition time to mean what its name says.

ALTER TABLE job_applications
    ADD COLUMN posted_at            TIMESTAMPTZ,
    ADD COLUMN location_city        VARCHAR(120),
    ADD COLUMN location_region      VARCHAR(120),
    ADD COLUMN location_country     VARCHAR(120),
    ADD COLUMN is_remote            BOOLEAN,
    ADD COLUMN salary_min           NUMERIC(12, 2),
    ADD COLUMN salary_max           NUMERIC(12, 2),
    ADD COLUMN salary_currency      VARCHAR(10),
    ADD COLUMN salary_period        VARCHAR(20),
    ADD COLUMN company_logo_url     VARCHAR(2048),
    ADD COLUMN description_snapshot TEXT,
    ADD COLUMN duplicate_of_id      UUID REFERENCES job_applications(id) ON DELETE SET NULL;

ALTER TABLE job_applications
    ADD CONSTRAINT job_applications_salary_period_check
        CHECK (salary_period IS NULL OR salary_period IN ('yearly', 'monthly', 'weekly', 'hourly'));

-- Widen the source taxonomy for the generic (non-LinkedIn) capture parser.
ALTER TABLE job_applications
    DROP CONSTRAINT job_applications_source_check;

ALTER TABLE job_applications
    ADD CONSTRAINT job_applications_source_check
        CHECK (source IN ('linkedin', 'manual', 'other'));

CREATE INDEX idx_job_applications_duplicate_of ON job_applications(duplicate_of_id);

-- Supports duplicate/repost detection lookups (case-insensitive company+title match).
CREATE INDEX idx_job_applications_dup_lookup ON job_applications(user_id, lower(company_name), lower(job_title));
