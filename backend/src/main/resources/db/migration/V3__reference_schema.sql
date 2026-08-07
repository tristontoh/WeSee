-- Reference/configurable data: sustainability matters, indicator definitions, feature flags,
-- matter-set rules, transition-relief rules. Kept as data (not hard-coded logic) so SEDG/Bursa
-- framework revisions don't require a redeploy.

ALTER TABLE company ADD COLUMN sector_module_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE sustainability_matter (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE')),
    description TEXT,
    matter_set VARCHAR(20) NOT NULL CHECK (matter_set IN ('SEDG', 'BURSA_MAIN', 'BURSA_ACE', 'SECTOR'))
);

CREATE TABLE indicator_definition (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    matter_id VARCHAR(30) NOT NULL REFERENCES sustainability_matter (id) ON DELETE RESTRICT,
    category VARCHAR(20) NOT NULL CHECK (category IN ('ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE')),
    is_sector_specific BOOLEAN NOT NULL DEFAULT FALSE,
    sector_code VARCHAR(50) REFERENCES sector (code) ON DELETE RESTRICT,
    default_target NUMERIC(18, 4),
    default_target_direction VARCHAR(10) CHECK (default_target_direction IN ('UP', 'DOWN'))
);

CREATE INDEX idx_indicator_definition_matter ON indicator_definition (matter_id);

CREATE TABLE feature_flag (
    feature_key VARCHAR(50) PRIMARY KEY,
    min_plan VARCHAR(30) NOT NULL CHECK (min_plan IN ('STARTER', 'GROWTH', 'ISSUER_READY')),
    visible_only_at_min_plan BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE matter_set_rule (
    matter_set VARCHAR(20) PRIMARY KEY CHECK (matter_set IN ('SEDG', 'BURSA_MAIN', 'BURSA_ACE', 'SECTOR')),
    min_plan VARCHAR(30) NOT NULL CHECK (min_plan IN ('STARTER', 'GROWTH', 'ISSUER_READY')),
    market_classification VARCHAR(30) CHECK (market_classification IN ('SME', 'MAIN_MARKET', 'ACE_MARKET'))
);

CREATE TABLE transition_relief_rule (
    market_classification VARCHAR(30) PRIMARY KEY CHECK (market_classification IN ('SME', 'MAIN_MARKET', 'ACE_MARKET')),
    relief_years INTEGER NOT NULL
);
