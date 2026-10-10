-- Per-fiscal-year denominators. Fifteen of the catalogue's sixteen ESG formulas are ratios and
-- the platform held none of what they divide by; this is that data. Narrow key/value rather than
-- a column per figure, so a new denominator is an enum constant instead of a migration.
-- Deliberately absent: total energy (IND-ENG-01 already holds it) and total waste (IND-WST-01/02
-- already hold it). Where an indicator owns a number, the derivation reads the indicator.

CREATE TABLE company_annual_figure (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    figure_key VARCHAR(40) NOT NULL,
    value NUMERIC(18, 4) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    source_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, fiscal_year, figure_key)
);

CREATE INDEX idx_company_annual_figure_company_year
    ON company_annual_figure (company_id, fiscal_year);
