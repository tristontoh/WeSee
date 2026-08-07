CREATE TABLE governance_level (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    level VARCHAR(20) NOT NULL CHECK (level IN ('OVERSIGHT', 'STRATEGIC', 'IMPLEMENTATION')),
    role_title VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, level)
);

CREATE TABLE matter_ownership (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    matter_id VARCHAR(30) NOT NULL REFERENCES sustainability_matter (id) ON DELETE RESTRICT,
    owner_name VARCHAR(200) NOT NULL,
    oversight_level VARCHAR(20) NOT NULL CHECK (oversight_level IN ('OVERSIGHT', 'STRATEGIC', 'IMPLEMENTATION')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, matter_id)
);

CREATE INDEX idx_matter_ownership_company ON matter_ownership (company_id);
