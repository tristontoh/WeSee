CREATE TABLE performance_target (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    baseline_year INTEGER NOT NULL,
    target_year INTEGER NOT NULL,
    target_value NUMERIC(18, 4) NOT NULL,
    current_progress INTEGER NOT NULL DEFAULT 0 CHECK (current_progress BETWEEN 0 AND 100),
    indicator_definition_id VARCHAR(30) REFERENCES indicator_definition (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_performance_target_company ON performance_target (company_id);
