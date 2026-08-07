CREATE TABLE company_email_settings (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL UNIQUE REFERENCES company (id) ON DELETE CASCADE,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_username VARCHAR(255) NOT NULL,
    smtp_password_encrypted VARCHAR(1000) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_test_at TIMESTAMP,
    last_test_success BOOLEAN,
    last_test_message VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
