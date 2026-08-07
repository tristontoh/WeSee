CREATE TABLE tenant_indicator (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    indicator_definition_id VARCHAR(30) NOT NULL REFERENCES indicator_definition (id) ON DELETE RESTRICT,
    target NUMERIC(18, 4),
    target_direction VARCHAR(10) CHECK (target_direction IN ('UP', 'DOWN')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, indicator_definition_id)
);

CREATE TABLE indicator_value (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    indicator_definition_id VARCHAR(30) NOT NULL REFERENCES indicator_definition (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    value NUMERIC(18, 4),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, indicator_definition_id, fiscal_year)
);

CREATE INDEX idx_indicator_value_company ON indicator_value (company_id);

CREATE TABLE indicator_audit_entry (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    indicator_definition_id VARCHAR(30) NOT NULL REFERENCES indicator_definition (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    value NUMERIC(18, 4) NOT NULL,
    entered_by VARCHAR(200) NOT NULL,
    source_doc_name VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_indicator_audit_company ON indicator_audit_entry (company_id);
CREATE INDEX idx_indicator_audit_def_year ON indicator_audit_entry (indicator_definition_id, fiscal_year);
