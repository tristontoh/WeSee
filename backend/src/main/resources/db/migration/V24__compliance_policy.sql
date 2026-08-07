CREATE TABLE compliance_policy (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    policy_key VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    review_cycle_months INTEGER NOT NULL,
    last_reviewed_at TIMESTAMP,
    document_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, policy_key)
);

CREATE INDEX idx_compliance_policy_company ON compliance_policy (company_id);
