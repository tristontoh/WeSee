-- Renumbered from the design's V83, for the reason given in V89.
--
-- The buyer's own record of what it drew from a supplier's snapshot. Tenant-owned by the BUYER,
-- so unlike the two shared tables this one sits under the ordinary Hibernate filter.
--
-- share_fraction is stored rather than recomputed: the audit trail must show the division that
-- was actually performed, even after the supplier republishes with a different basis.

CREATE TABLE scope3_allocation (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    shared_disclosure_id UUID NOT NULL REFERENCES shared_disclosure (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    purchased_quantity NUMERIC(18, 4) NOT NULL,
    purchased_unit VARCHAR(30) NOT NULL,
    share_fraction NUMERIC(12, 6) NOT NULL,
    allocated_tco2e NUMERIC(18, 4) NOT NULL,
    -- The activity entry this produced in the buyer's own ledger, so removing the allocation can
    -- remove the emissions it added rather than leaving them orphaned.
    emission_activity_entry_id UUID REFERENCES emission_activity_entry (id) ON DELETE SET NULL,
    -- 1 for now. The column exists so categories 2 and 4 can follow without a migration.
    ghg_category INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, shared_disclosure_id),
    CONSTRAINT scope3_allocation_share_within_one CHECK (share_fraction >= 0 AND share_fraction <= 1)
);

CREATE INDEX idx_scope3_allocation_company_year ON scope3_allocation (company_id, fiscal_year);

-- A unit-conversion factor, not an estimate. An allocated figure is already tCO2e, so the only
-- arithmetic left is kg-per-tonne — which lets the allocation flow through the ordinary
-- EmissionActivityService.addEntry path and pick up the activity list, the CSV export and the
-- assurance hash with no special-casing anywhere.
INSERT INTO emission_factor (id, name, scope, activity_unit, factor_value, source, source_year)
VALUES ('SUPPLIER_ALLOCATED_S3C1',
        'Purchased goods & services — supplier-verified allocation',
        'SCOPE_3', 'tCO2e', 1000.000000,
        'Supplier''s own signed-off Scope 1 + 2, allocated by physical share (GHG Protocol)',
        2026);
