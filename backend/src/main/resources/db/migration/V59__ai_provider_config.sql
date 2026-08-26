-- Per-company bring-your-own LLM API key configuration. One row per company (switching provider
-- means re-entering a new key for it) — same shape/semantics as company_email_settings.
CREATE TABLE ai_provider_config (
    id                  UUID PRIMARY KEY,
    company_id          UUID NOT NULL UNIQUE REFERENCES company (id) ON DELETE CASCADE,
    provider            VARCHAR(20) NOT NULL,
    model               VARCHAR(100) NOT NULL,
    api_key_encrypted   VARCHAR(1000) NOT NULL,
    enabled             BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);
