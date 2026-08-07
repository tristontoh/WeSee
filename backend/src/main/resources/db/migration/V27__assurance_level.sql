ALTER TABLE sign_off_record ADD COLUMN assurance_level VARCHAR(20) NOT NULL DEFAULT 'INTERNAL_REVIEW' CHECK (assurance_level IN ('INTERNAL_REVIEW', 'EXTERNAL_LIMITED', 'EXTERNAL_REASONABLE'));
ALTER TABLE sign_off_record ADD COLUMN external_assurer_name VARCHAR(200);
ALTER TABLE sign_off_record ADD COLUMN standard_referenced VARCHAR(100);
