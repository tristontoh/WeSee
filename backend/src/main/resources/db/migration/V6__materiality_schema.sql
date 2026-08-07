CREATE TABLE materiality_assessment (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    assessment_date DATE NOT NULL,
    plan_at_capture VARCHAR(30) NOT NULL CHECK (plan_at_capture IN ('STARTER', 'GROWTH', 'ISSUER_READY')),
    market_at_capture VARCHAR(30) CHECK (market_at_capture IN ('SME', 'MAIN_MARKET', 'ACE_MARKET')),
    created_by_name VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_materiality_assessment_company ON materiality_assessment (company_id);

CREATE TABLE materiality_score (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    assessment_id UUID NOT NULL REFERENCES materiality_assessment (id) ON DELETE CASCADE,
    matter_id VARCHAR(30) NOT NULL REFERENCES sustainability_matter (id) ON DELETE RESTRICT,
    impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
    influence INTEGER NOT NULL CHECK (influence BETWEEN 1 AND 5),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (assessment_id, matter_id)
);

CREATE TABLE materiality_stakeholder_snapshot (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    assessment_id UUID NOT NULL REFERENCES materiality_assessment (id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE stakeholder_option (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    selected BOOLEAN NOT NULL DEFAULT TRUE,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_stakeholder_option_company ON stakeholder_option (company_id);
