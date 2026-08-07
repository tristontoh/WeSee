CREATE TABLE export_history_item (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    export_type VARCHAR(100) NOT NULL,
    format VARCHAR(10) NOT NULL CHECK (format IN ('PDF', 'WORD', 'CSV', 'CSV_CSI')),
    fiscal_year INTEGER NOT NULL,
    generated_by_name VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_export_history_company ON export_history_item (company_id);
