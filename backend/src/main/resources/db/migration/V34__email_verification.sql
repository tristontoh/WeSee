ALTER TABLE app_user ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE app_user ADD COLUMN email_verified_at TIMESTAMP;

CREATE TABLE email_verification_token (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verification_token_user ON email_verification_token (user_id);
