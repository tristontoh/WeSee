CREATE TABLE sign_off_record (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('SIGNED', 'REVOKED')),
    signer_name VARCHAR(200),
    signer_title VARCHAR(200),
    notes TEXT,
    hash VARCHAR(64),
    signed_at TIMESTAMP,
    revoked_at TIMESTAMP,
    revoked_by VARCHAR(200),
    revocation_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, fiscal_year)
);

CREATE TABLE sign_off_audit_entry (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('SIGNED', 'REVOKED')),
    actor_name VARCHAR(200) NOT NULL,
    actor_title VARCHAR(200),
    notes TEXT,
    hash VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_signoff_audit_company_year ON sign_off_audit_entry (company_id, fiscal_year);
