-- Monthly indicator data entry with automatic annual aggregation (PRD/SRS update): indicators are
-- now entered monthly as data becomes available, and the disclosure-facing annual IndicatorValue is
-- computed automatically per an aggregation_rule, rather than hand-typed. A minority of indicators
-- (policy/assessment-style, no natural monthly cadence) keep direct annual entry via DIRECT_ANNUAL.

ALTER TABLE indicator_definition ADD COLUMN aggregation_rule VARCHAR(20) NOT NULL DEFAULT 'DIRECT_ANNUAL'
    CHECK (aggregation_rule IN ('SUM', 'LATEST', 'AVERAGE', 'COUNT', 'DIRECT_ANNUAL'));

ALTER TABLE indicator_value ADD COLUMN is_computed BOOLEAN NOT NULL DEFAULT FALSE;

-- NULL month = an annual correction (today's existing behavior, unchanged). Non-null month = a
-- correction to one month's entry, part of the audit trail behind a computed annual figure.
ALTER TABLE indicator_audit_entry ADD COLUMN month INTEGER CHECK (month BETWEEN 1 AND 12);

CREATE TABLE indicator_monthly_value (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    indicator_definition_id VARCHAR(30) NOT NULL REFERENCES indicator_definition (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    value NUMERIC(18, 4),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, indicator_definition_id, fiscal_year, month)
);

CREATE INDEX idx_indicator_monthly_value_company ON indicator_monthly_value (company_id);

-- Reclassify seed indicators (default above is DIRECT_ANNUAL = today's exact behavior; only
-- override where a monthly-rollup rule genuinely applies).
UPDATE indicator_definition SET aggregation_rule = 'SUM' WHERE id IN
    ('IND-ENG-01', 'IND-ENG-02', 'IND-ENG-03', 'IND-WAT-01', 'IND-WST-01', 'IND-WST-02',
     'IND-LAB-01', 'IND-COM-01', 'IND-BR-02', 'IND-SEC-MFG-02', 'IND-SEC-MFG-03');

UPDATE indicator_definition SET aggregation_rule = 'LATEST' WHERE id IN
    ('IND-GOV-01', 'IND-BR-03');

UPDATE indicator_definition SET aggregation_rule = 'AVERAGE' WHERE id IN
    ('IND-WAT-02', 'IND-LAB-02', 'IND-BR-04', 'IND-SEC-MFG-01');

UPDATE indicator_definition SET aggregation_rule = 'COUNT' WHERE id IN
    ('IND-GOV-02');

-- IND-BR-01 (Climate Change physical risks assessed, % sites) stays DIRECT_ANNUAL — an annual
-- assessment exercise, not something with natural monthly data.
