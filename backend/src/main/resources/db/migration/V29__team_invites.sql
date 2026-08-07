CREATE TABLE team_invite (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('COMPANY_ADMIN', 'COMPANY_CONTRIBUTOR', 'CONSULTANT')),
    token VARCHAR(64) NOT NULL UNIQUE,
    invited_by_name VARCHAR(200),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_invite_company ON team_invite (company_id);
CREATE INDEX idx_team_invite_token ON team_invite (token);
