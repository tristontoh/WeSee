-- A copy of what an uploaded document says, beside the figures it implies.
--
-- One jsonb column rather than tables for sections, rows and cells: this is a faithful copy for a
-- reviewer and an audit trail, not something queried by column. A bill's shape is not predictable
-- either — a TNB large-power bill carries a meter table with a row per unit, a water bill carries
-- different ones — so relational modelling would mean a migration per document format.
--
-- Anything that later needs to be queried (an invoice number for duplicate detection, a billing
-- period to infer a record's month) gets promoted to its own column then, with a backfill from here.

ALTER TABLE extracted_document
    ADD COLUMN transcription jsonb;
