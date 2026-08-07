-- Board/management approval on reported indicator values (mirrors materiality's Draft/Validated
-- pattern), plus a real storage path for uploaded evidence files (replacing the previous
-- simulated-upload UI, which only ever recorded a filename string with no actual file behind it).

ALTER TABLE indicator_value ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED'));
ALTER TABLE indicator_value ADD COLUMN approved_by_name VARCHAR(200);
ALTER TABLE indicator_value ADD COLUMN approved_at TIMESTAMP;

ALTER TABLE indicator_audit_entry ADD COLUMN source_doc_path VARCHAR(500);
