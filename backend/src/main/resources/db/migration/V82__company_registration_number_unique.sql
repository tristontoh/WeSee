-- One SSM number, one workspace.
--
-- Partial rather than a plain UNIQUE, and the column stays nullable, because every company that
-- existed before this migration has no registration number and never will unless someone edits it.
-- A NOT NULL would break all of them; a full UNIQUE would be fine on Postgres (nulls do not
-- collide) but says something the schema does not mean — that the blank ones are a value.
--
-- Numbers are stored canonically: twelve digits, no spaces, no bracketed legacy number. The
-- canonicalisation is what makes this index worth having, since 1234567-A and 202101012345 can be
-- the same company and the database cannot know it.
CREATE UNIQUE INDEX uq_company_registration_number
    ON company (registration_number)
    WHERE registration_number IS NOT NULL;
