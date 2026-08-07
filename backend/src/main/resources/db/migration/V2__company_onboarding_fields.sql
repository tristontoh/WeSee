ALTER TABLE company
    ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN frameworks_csv TEXT,
    ADD COLUMN priorities_csv TEXT;
