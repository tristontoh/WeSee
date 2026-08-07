-- Core tenant/user schema: Sector (reference), Company (tenant root), AppUser.

CREATE TABLE sector (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

INSERT INTO sector (code, name) VALUES
    ('MANUFACTURING', 'Manufacturing'),
    ('LOGISTICS', 'Logistics & Supply Chain'),
    ('RETAIL_TRADE', 'Retail & General Trade'),
    ('TECHNOLOGY_SERVICES', 'Technology & Services'),
    ('AGRICULTURE', 'Agriculture & Agri-Processing'),
    ('FINANCIAL_SERVICES', 'Financial Services'),
    ('CONSTRUCTION_REAL_ESTATE', 'Construction & Real Estate'),
    ('OTHER', 'Other');

CREATE TABLE company (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sector_code VARCHAR(50) REFERENCES sector (code) ON DELETE RESTRICT,
    size_band VARCHAR(30) CHECK (size_band IN ('MICRO', 'SMALL', 'MEDIUM', 'LARGE')),
    market_classification VARCHAR(30) NOT NULL CHECK (market_classification IN ('SME', 'MAIN_MARKET', 'ACE_MARKET')),
    subscription_plan VARCHAR(30) NOT NULL CHECK (subscription_plan IN ('STARTER', 'GROWTH', 'ISSUER_READY')),
    fiscal_year_end_month INTEGER NOT NULL DEFAULT 12,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES company (id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('COMPANY_ADMIN', 'COMPANY_CONTRIBUTOR', 'CONSULTANT', 'PLATFORM_ADMIN')),
    token_version INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_user_company ON app_user (company_id);
