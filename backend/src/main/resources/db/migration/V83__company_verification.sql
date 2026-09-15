-- Whether this company has shown anything to back the name it files disclosures under.
--
-- The gate sits on sign-off and the Bursa CSI export, not on registration: those are the two acts
-- that make a claim to the outside world in a company's name, and they are also a tiny fraction of
-- accounts. Checking everyone at the door costs hours; checking the few who actually file costs
-- minutes, and is the only version that scales.
--
-- UNVERIFIED is the default and is not a failure state — it is simply where every company starts
-- and where most will stay, because most never export anything.
ALTER TABLE company ADD COLUMN verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE company ADD COLUMN verified_at TIMESTAMP;

-- The document that was accepted, and the name the reader found on it. Kept because "verified" with
-- nothing behind it is a claim we could not later defend to an auditor or to the company itself.
ALTER TABLE company ADD COLUMN verification_document_path VARCHAR(500);
ALTER TABLE company ADD COLUMN verification_evidence_name VARCHAR(300);

-- Bounded so nobody can sit there feeding documents until one happens to pass.
ALTER TABLE company ADD COLUMN verification_attempts INTEGER NOT NULL DEFAULT 0;
