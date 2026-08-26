-- Completes the FK index audit started in V65: every remaining foreign-key column in the schema
-- that wasn't already the leading column of some index (found via pg_constraint/pg_index
-- introspection, not manual review).

-- Reverse lookups on the reference tables app_user.role, company.sector_code, and
-- indicator_definition.sector_code point to (roles table with 5 rows, sector with 8 rows) —
-- an index won't change the planner's mind on such a tiny target table, but is included here for
-- completeness/FK coverage and costs negligible write overhead.
CREATE INDEX idx_app_user_role ON app_user (role);
CREATE INDEX idx_company_sector_code ON company (sector_code);
CREATE INDEX idx_indicator_definition_sector_code ON indicator_definition (sector_code);

-- materiality_score.matter_id: UNIQUE (assessment_id, matter_id) only covers assessment_id as the
-- leading column, leaving matter_id-only lookups (e.g. "which companies scored this matter")
-- unindexed.
CREATE INDEX idx_materiality_score_matter ON materiality_score (matter_id);

-- tenant_indicator.indicator_definition_id: UNIQUE (company_id, indicator_definition_id) only
-- covers company_id as the leading column.
CREATE INDEX idx_tenant_indicator_definition ON tenant_indicator (indicator_definition_id);
