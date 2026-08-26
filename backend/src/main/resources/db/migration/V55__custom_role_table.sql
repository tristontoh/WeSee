-- Per-company custom roles. Granted permission keys are stored as a delimited string in
-- permission_keys (see StringListConverter), the same convention already used by
-- api_token.scopes, rather than a separate join table with no extra columns of its own.

CREATE TABLE custom_role (
    id                UUID PRIMARY KEY,
    company_id        UUID NOT NULL REFERENCES company (id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    description       TEXT,
    permission_keys   VARCHAR(2000),
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, name)
);

CREATE INDEX idx_custom_role_company ON custom_role (company_id);
