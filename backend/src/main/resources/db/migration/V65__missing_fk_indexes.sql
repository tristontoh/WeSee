-- Adds missing indexes on foreign-key columns that are queried directly but weren't covered by
-- any existing index or as the leading column of a composite/unique index. Found by auditing all
-- prior migrations as data volume grows (tenant count x time), several per-company lookups were
-- doing sequential scans.

-- platform_activity_log is filtered by company_id for the company-scoped audit log view
-- (V63/V64) but only had an index on created_at — the most impactful gap found.
CREATE INDEX idx_platform_activity_log_company ON platform_activity_log (company_id);

-- Materiality: scores/snapshots are read per company/assessment when rendering the materiality
-- matrix and were previously unindexed on company_id (only materiality_assessment and
-- stakeholder_option were covered).
CREATE INDEX idx_materiality_score_company ON materiality_score (company_id);
CREATE INDEX idx_materiality_stakeholder_snapshot_company ON materiality_stakeholder_snapshot (company_id);
CREATE INDEX idx_materiality_stakeholder_snapshot_assessment ON materiality_stakeholder_snapshot (assessment_id);

-- Climate: s1_risk_opportunity was only indexed on segment_id, not company_id; scope3_value had
-- no index on company_id at all (its UNIQUE constraint leads with scope3_category_id).
CREATE INDEX idx_s1_risk_opportunity_company ON s1_risk_opportunity (company_id);
CREATE INDEX idx_scope3_value_company ON scope3_value (company_id);

-- Indicator data entry: both tables' UNIQUE constraints lead with company_id, leaving
-- indicator_definition_id (used for admin/cross-tenant analytics and reverse lookups)
-- unsupported by any index.
CREATE INDEX idx_indicator_value_definition ON indicator_value (indicator_definition_id);
CREATE INDEX idx_indicator_monthly_value_definition ON indicator_monthly_value (indicator_definition_id);

-- Remaining FK columns with no supporting index.
CREATE INDEX idx_support_ticket_submitted_by ON support_ticket (submitted_by);
CREATE INDEX idx_ticket_message_sender ON ticket_message (sender_id);
CREATE INDEX idx_api_token_created_by ON api_token (created_by_user_id);
CREATE INDEX idx_team_invite_custom_role ON team_invite (custom_role_id);
CREATE INDEX idx_app_user_custom_role ON app_user (custom_role_id);
CREATE INDEX idx_performance_target_indicator_definition ON performance_target (indicator_definition_id);
CREATE INDEX idx_emission_activity_entry_factor ON emission_activity_entry (emission_factor_id);
CREATE INDEX idx_matter_ownership_matter ON matter_ownership (matter_id);
CREATE INDEX idx_ifrs_s2_disclosure_linked_target ON ifrs_s2_disclosure (linked_target_id);
