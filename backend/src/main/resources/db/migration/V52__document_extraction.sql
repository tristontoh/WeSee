-- Document extraction staging. Uploaded source documents (utility bills, invoices) are read by a
-- model, and the records they imply are proposed here rather than written straight into the real
-- tables. Nothing reaches indicator_value or emission_activity_entry without a human accepting it:
-- the assurance module computes a tamper-evident hash over indicator values, so machine output must
-- not be able to enter that set unreviewed.

CREATE TABLE extracted_document (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    original_file_name VARCHAR(255) NOT NULL,
    stored_path VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'EXTRACTING', 'READY', 'FAILED')),
    failure_reason TEXT,
    uploaded_by VARCHAR(200) NOT NULL,
    model_used VARCHAR(100),
    extracted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_extracted_document_company ON extracted_document (company_id, created_at DESC);

-- Typed columns rather than a JSON payload: half of these apply per target_type, but this lets
-- Postgres enforce the foreign keys, so extraction can never propose an emission factor or
-- indicator that does not exist.
CREATE TABLE extracted_record (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    document_id UUID NOT NULL REFERENCES extracted_document (id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('EMISSION_ACTIVITY', 'INDICATOR_VALUE')),

    emission_factor_id VARCHAR(30) REFERENCES emission_factor (id) ON DELETE RESTRICT,
    quantity NUMERIC(18, 4),

    indicator_definition_id VARCHAR(30) REFERENCES indicator_definition (id) ON DELETE RESTRICT,
    month INTEGER CHECK (month BETWEEN 1 AND 12),

    fiscal_year INTEGER NOT NULL,
    value NUMERIC(18, 4) NOT NULL,
    unit_as_read VARCHAR(30),
    confidence NUMERIC(4, 3),
    source_snippet TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PROPOSED', 'ACCEPTED', 'REJECTED')),
    committed_entity_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT emission_target_has_factor CHECK (
        target_type <> 'EMISSION_ACTIVITY' OR (emission_factor_id IS NOT NULL AND quantity IS NOT NULL)),
    CONSTRAINT indicator_target_has_definition CHECK (
        target_type <> 'INDICATOR_VALUE' OR indicator_definition_id IS NOT NULL)
);

CREATE INDEX idx_extracted_record_document ON extracted_record (document_id, created_at);
