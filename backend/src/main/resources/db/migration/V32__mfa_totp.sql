CREATE TABLE user_totp_secret (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES app_user (id) ON DELETE CASCADE,
    secret_encrypted VARCHAR(500) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    enabled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_totp_secret_user ON user_totp_secret (user_id);

CREATE TABLE user_backup_code (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_backup_code_user ON user_backup_code (user_id);
