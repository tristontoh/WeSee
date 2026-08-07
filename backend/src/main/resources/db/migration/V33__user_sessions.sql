CREATE TABLE user_session (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    jti VARCHAR(36) NOT NULL UNIQUE,
    ip_address VARCHAR(64),
    user_agent VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMP NOT NULL DEFAULT now(),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_session_user ON user_session (user_id);
CREATE INDEX idx_user_session_jti ON user_session (jti);
