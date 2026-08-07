CREATE TABLE business_segment (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, name)
);

CREATE TABLE s1_risk_opportunity (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    segment_id UUID NOT NULL REFERENCES business_segment (id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('RISK', 'OPPORTUNITY')),
    description TEXT,
    horizon VARCHAR(10) NOT NULL CHECK (horizon IN ('SHORT', 'MEDIUM', 'LONG')),
    financial_impact NUMERIC(18, 4),
    currency VARCHAR(5) NOT NULL CHECK (currency IN ('MYR', 'USD', 'EUR')),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_s1_item_segment ON s1_risk_opportunity (segment_id);

CREATE TABLE ifrs_s2_disclosure (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    oversight_description TEXT,
    review_frequency VARCHAR(20) CHECK (review_frequency IN ('MONTHLY', 'QUARTERLY', 'BI_ANNUALLY', 'ANNUALLY')),
    responsible_committee VARCHAR(200),
    physical_risks TEXT,
    transition_plan TEXT,
    climate_resilience TEXT,
    identification_process TEXT,
    integration_level VARCHAR(30) CHECK (integration_level IN ('FULLY_INTEGRATED', 'PARTIALLY_INTEGRATED', 'STANDALONE_PROCESS')),
    tracked_metrics TEXT,
    reduction_targets TEXT,
    carbon_pricing TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id)
);

CREATE TABLE emission_value (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    scope VARCHAR(10) NOT NULL CHECK (scope IN ('SCOPE_1', 'SCOPE_2')),
    fiscal_year INTEGER NOT NULL,
    value NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, scope, fiscal_year)
);

CREATE TABLE scope3_category (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    tooltip TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, name)
);

CREATE TABLE scope3_value (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    scope3_category_id UUID NOT NULL REFERENCES scope3_category (id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    value NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (scope3_category_id, fiscal_year)
);
