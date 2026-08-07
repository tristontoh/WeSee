CREATE TABLE platform_settings (
    id UUID PRIMARY KEY,
    smtp_host VARCHAR(255),
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password_encrypted VARCHAR(1000),
    from_address VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    app_base_url VARCHAR(500),
    last_test_at TIMESTAMP,
    last_test_success BOOLEAN,
    last_test_message VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
