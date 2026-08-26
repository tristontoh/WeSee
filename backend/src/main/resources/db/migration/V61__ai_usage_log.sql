-- Append-only usage log for AI drafting/assistant calls — visibility only, no enforced quota
-- (the company's own provider account is what limits their spend). Real token counts as returned
-- by each vendor's API, not estimates.
CREATE TABLE ai_usage_log (
    id              UUID PRIMARY KEY,
    company_id      UUID NOT NULL REFERENCES company (id) ON DELETE CASCADE,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    feature         VARCHAR(30) NOT NULL,
    draft_type      VARCHAR(60),
    provider        VARCHAR(20) NOT NULL,
    model           VARCHAR(100) NOT NULL,
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    success         BOOLEAN NOT NULL,
    error_message   VARCHAR(1000)
);

CREATE INDEX idx_ai_usage_log_company_created ON ai_usage_log (company_id, created_at);
