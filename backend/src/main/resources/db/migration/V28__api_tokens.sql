CREATE TABLE api_token (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    token_prefix VARCHAR(16) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    scopes VARCHAR(500) NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES app_user (id),
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_token_company ON api_token (company_id);
CREATE INDEX idx_api_token_hash ON api_token (token_hash);
