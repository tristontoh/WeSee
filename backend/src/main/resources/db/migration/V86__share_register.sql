-- Capital structure per fiscal year, and the holders behind it. Holders are rows rather than a
-- stored "top 5 total", because that total goes stale the moment the sixth holder overtakes the
-- fifth — "top 5" is a query, not a figure. For the same reason there is no `rank` column: rank
-- is ORDER BY shares_held DESC, and storing it would be a second source of truth that drifts on
-- every edit.

CREATE TABLE share_capital (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    total_outstanding_shares NUMERIC(18, 4) NOT NULL,
    public_held_shares NUMERIC(18, 4),
    bumiputera_held_shares NUMERIC(18, 4),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, fiscal_year),
    CONSTRAINT share_capital_total_positive CHECK (total_outstanding_shares > 0),
    CONSTRAINT share_capital_public_within_total CHECK (
        public_held_shares IS NULL
        OR (public_held_shares >= 0 AND public_held_shares <= total_outstanding_shares)
    ),
    CONSTRAINT share_capital_bumiputera_within_total CHECK (
        bumiputera_held_shares IS NULL
        OR (bumiputera_held_shares >= 0 AND bumiputera_held_shares <= total_outstanding_shares)
    )
);

CREATE TABLE shareholding (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    holder_name VARCHAR(250) NOT NULL,
    shares_held NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT shareholding_shares_non_negative CHECK (shares_held >= 0)
);

CREATE INDEX idx_shareholding_company_year ON shareholding (company_id, fiscal_year, shares_held DESC);
