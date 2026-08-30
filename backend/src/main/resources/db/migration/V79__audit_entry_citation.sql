-- The page and the sentence, carried onto the audit entry.
--
-- The entry already names the document a figure came from. What it could not say is where in it,
-- so a report generated from these entries could cite a filename and nothing more — and a filename
-- is not a citation on a forty-page statement.
--
-- Copied at acceptance rather than joined at read time. The audit entry is the record of what a
-- person confirmed and when; resolving it later through extracted_record would make a historical
-- fact depend on rows that can be re-extracted or deleted underneath it.
ALTER TABLE indicator_audit_entry ADD COLUMN source_page INTEGER;
ALTER TABLE indicator_audit_entry ADD COLUMN source_quote TEXT;

COMMENT ON COLUMN indicator_audit_entry.source_page IS
    '1-based page of the source document, as read; null for entries made before this or for documents with no pages.';
COMMENT ON COLUMN indicator_audit_entry.source_quote IS
    'The sentence the figure was read from, verbatim.';
