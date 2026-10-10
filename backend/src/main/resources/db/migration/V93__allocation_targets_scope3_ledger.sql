-- The allocated figure now writes the buyer's reported Scope 3 Category 1 (scope3_value) rather
-- than an emission_activity_entry. Nothing read activity entries into a reported Scope 3 figure:
-- EmissionsService calls scopeSeries for scopes 1 and 2 only. So the first implementation told
-- the user "added to your Scope 3" while the Emissions screen never moved.
--
-- With that path gone, the unit-conversion factor V91 seeded has no caller. Leaving it would also
-- leave it in the ordinary factor dropdown, where anyone could type an arbitrary Scope 3 tonnage
-- straight into the activity screen and bypass every allocation guard.

DELETE FROM emission_activity_entry WHERE emission_factor_id = 'SUPPLIER_ALLOCATED_S3C1';
DELETE FROM emission_factor WHERE id = 'SUPPLIER_ALLOCATED_S3C1';

ALTER TABLE scope3_allocation DROP COLUMN emission_activity_entry_id;

-- One allocation per buyer, per supplier relationship, per year — not per snapshot. Keying on the
-- snapshot let a republish (which creates a NEW shared_disclosure id) produce a SECOND allocation
-- for the same purchase, so a buyer who re-entered its quantity against the newer version carried
-- the purchase twice. The link and the year are what the relationship actually is.
ALTER TABLE scope3_allocation DROP CONSTRAINT scope3_allocation_company_id_shared_disclosure_id_key;

-- One live snapshot per link and year. Without this, two concurrent publishes both insert and
-- findLiveForLinkAndYear then throws on every later publish for that link and year, permanently.
CREATE UNIQUE INDEX uq_shared_disclosure_live_per_year
    ON shared_disclosure (supply_link_id, fiscal_year)
    WHERE revoked_at IS NULL;

-- Who actually accepted. The token is the authorisation, which is right for an invitation a
-- supplier's sustainability lead may receive forwarded from the mailbox it was sent to — but the
-- invited address was then recorded and never compared with anyone, leaving no trace of which
-- user bound their company to the link.
ALTER TABLE supply_link ADD COLUMN accepted_by_user_id UUID REFERENCES app_user (id) ON DELETE SET NULL;
ALTER TABLE supply_link ADD COLUMN accepted_by_email VARCHAR(255);
