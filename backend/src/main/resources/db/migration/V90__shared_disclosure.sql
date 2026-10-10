-- Renumbered from the design's V82, for the reason given in V89.
--
-- A supplier's signed-off year, snapshotted for one buyer. Not tenant-owned; reached only
-- through a supply_link, and every query binds the acting company id.
--
-- Only the number and its attestation cross the boundary. The supplier's documents do not: a TNB
-- bill carries an account number, a service address and a tariff band, none of which is the
-- carbon number. An assurer who needs the original asks the supplier, as it would today.
--
-- But the CALCULATION does cross. Emission factors are public reference data, so 977.35 tCO2e
-- divided by a published 0.585 kgCO2e/kWh returns the consumption in one step. Hiding what cannot
-- be hidden would only cost the buyer the ability to show an assurer how the number was derived.

CREATE TABLE shared_disclosure (
    id UUID PRIMARY KEY,
    supply_link_id UUID NOT NULL REFERENCES supply_link (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    scope1_tco2e NUMERIC(18, 4) NOT NULL,
    scope2_tco2e NUMERIC(18, 4) NOT NULL,
    -- The denominator the buyer divides by: "977.35 tCO2e against 48,000 units produced".
    basis_quantity NUMERIC(18, 4) NOT NULL,
    basis_unit VARCHAR(30) NOT NULL,
    -- Copied from sign_off_record at publish time, not referenced. A sign-off is a point-in-time
    -- attestation and the snapshot inherits that semantic.
    sign_off_hash VARCHAR(64) NOT NULL,
    signer_name VARCHAR(200) NOT NULL,
    signed_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT now(),
    revoked_at TIMESTAMP,
    revocation_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT shared_disclosure_basis_positive CHECK (basis_quantity > 0)
);

CREATE INDEX idx_shared_disclosure_link ON shared_disclosure (supply_link_id, fiscal_year);

CREATE TABLE shared_disclosure_line (
    id UUID PRIMARY KEY,
    disclosure_id UUID NOT NULL REFERENCES shared_disclosure (id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL,
    -- Matches emission_factor.id (VARCHAR(40)) and factor_value (NUMERIC(14,6)) exactly, but
    -- copied, not referenced: when MGTC publishes a 2025 edition the reference table changes, and
    -- a disclosure signed under the 2024 factor must keep reporting what was signed.
    emission_factor_id VARCHAR(40) NOT NULL,
    emission_factor_name VARCHAR(200) NOT NULL,
    quantity NUMERIC(18, 4) NOT NULL,
    activity_unit VARCHAR(30) NOT NULL,
    factor_value NUMERIC(14, 6) NOT NULL,
    factor_source VARCHAR(200) NOT NULL,
    factor_source_year INTEGER,
    tco2e NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_disclosure_line_disclosure ON shared_disclosure_line (disclosure_id);
