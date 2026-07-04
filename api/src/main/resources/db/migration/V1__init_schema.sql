-- Initial schema for the Job Application Tracker MVP.
-- Postgres 13+ ships gen_random_uuid() as a built-in function (no pgcrypto
-- extension required as of PG13, and definitely available on postgres:16
-- used by the project's docker-compose.yml).

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    display_name  VARCHAR(255) NOT NULL,
    avatar_url    VARCHAR(2048),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kept for the Phase 2 OAuth follow-up (docs/ROADMAP.md). This MVP only
-- implements email/password auth, storing the hash directly on `users`, so
-- this table is not populated yet but the shape is here so the auth module
-- doesn't need a breaking migration when GitHub/Google/Apple login lands.
CREATE TABLE auth_identities (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         VARCHAR(20) NOT NULL CHECK (provider IN ('github', 'google', 'apple', 'email')),
    provider_user_id VARCHAR(255) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_auth_identities_provider_user UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_auth_identities_user_id ON auth_identities(user_id);

CREATE TABLE job_applications (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source         VARCHAR(20) NOT NULL CHECK (source IN ('linkedin', 'manual')),
    source_url     VARCHAR(2048),
    company_name   VARCHAR(255) NOT NULL,
    job_title      VARCHAR(255) NOT NULL,
    location_text  VARCHAR(255),
    salary_text    VARCHAR(255),
    applied_at     TIMESTAMPTZ,
    current_status VARCHAR(20) NOT NULL CHECK (current_status IN ('saved', 'applied', 'interviewing', 'rejected', 'ghosted', 'offer')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_job_applications_user_source_url UNIQUE (user_id, source_url)
);

CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_user_status ON job_applications(user_id, current_status);

CREATE TABLE application_status_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    status         VARCHAR(20) NOT NULL CHECK (status IN ('saved', 'applied', 'interviewing', 'rejected', 'ghosted', 'offer')),
    note           TEXT,
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_events_application_id ON application_status_events(application_id);
CREATE INDEX idx_status_events_changed_at ON application_status_events(changed_at DESC);

CREATE TABLE application_notes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    content        TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_application_notes_application_id ON application_notes(application_id);
