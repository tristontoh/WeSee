-- IFRS S1 (General Requirements) mandates four pillars — Governance, Strategy, Risk Management,
-- Metrics & Targets — across ALL material sustainability topics, not just climate. Until now this
-- app only captured the Strategy pillar (via s1_risk_opportunity, scoped per business segment).
-- This table adds the other three, mirroring ifrs_s2_disclosure's shape (one singleton row per
-- company, no per-section audit trail needed). Also adds `connected_information`, since S1
-- specifically requires disclosures to explain how they connect to the entity's financial
-- statements ("connected information") — a requirement with no existing field anywhere.
CREATE TABLE ifrs_s1_disclosure (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    oversight_description TEXT,
    review_frequency VARCHAR(20) CHECK (review_frequency IN ('MONTHLY', 'QUARTERLY', 'BI_ANNUALLY', 'ANNUALLY')),
    responsible_committee VARCHAR(200),
    identification_process TEXT,
    integration_level VARCHAR(30) CHECK (integration_level IN ('FULLY_INTEGRATED', 'PARTIALLY_INTEGRATED', 'STANDALONE_PROCESS')),
    tracked_metrics TEXT,
    targets_summary TEXT,
    connected_information TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id)
);
