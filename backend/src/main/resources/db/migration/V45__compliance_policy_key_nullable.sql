-- policy_key now identifies one of the 3 Bursa/MACC-mandated defaults (ANTI_CORRUPTION,
-- WHISTLEBLOWING, BOARD_GENDER_DIVERSITY) and is null for a company-added custom policy —
-- companies are no longer capped at those 3. Drop the NOT NULL constraint from V24.
ALTER TABLE compliance_policy ALTER COLUMN policy_key DROP NOT NULL;

-- V24 also enforced UNIQUE (company_id, policy_key); Postgres already treats multiple NULLs as
-- distinct under a unique constraint, so this doesn't block multiple custom policies per company
-- and needs no change.
