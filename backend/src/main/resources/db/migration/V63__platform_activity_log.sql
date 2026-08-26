CREATE TABLE platform_activity_log (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES company (id) ON DELETE SET NULL,
    company_name VARCHAR(200) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    description VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_activity_log_created_at ON platform_activity_log (created_at DESC);
