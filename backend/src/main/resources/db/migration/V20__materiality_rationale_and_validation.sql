-- Rationale/evidence per score, and a board/management validation step on the assessment —
-- closes the "Identify + Prioritise only, no Validate" gap against Bursa Malaysia's guide.

ALTER TABLE materiality_score ADD COLUMN rationale TEXT;

ALTER TABLE materiality_assessment ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VALIDATED'));
ALTER TABLE materiality_assessment ADD COLUMN validated_by_name VARCHAR(200);
ALTER TABLE materiality_assessment ADD COLUMN validated_at TIMESTAMP;
