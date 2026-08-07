ALTER TABLE company ADD COLUMN parent_company_id UUID NULL REFERENCES company (id);

CREATE INDEX idx_company_parent_company_id ON company (parent_company_id);
