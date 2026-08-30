-- Which page of the source document a figure was read from.
--
-- The link from a reported figure back to its evidence already exists: extracted_record keeps the
-- verbatim source_snippet and points at the document it came from. What a reviewer could not do was
-- open the document *at the right place* — on a two-page bill that is a minor annoyance, on a
-- forty-page annual statement it is the difference between a citation and a shrug.
--
-- Nullable: an image has no pages, and a model that cannot tell must leave it out rather than guess.
ALTER TABLE extracted_record ADD COLUMN source_page INTEGER;

COMMENT ON COLUMN extracted_record.source_page IS
    '1-based page of the source document this figure was read from; null when unknown or not paginated.';
