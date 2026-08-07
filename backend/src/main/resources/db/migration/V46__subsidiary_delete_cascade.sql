-- Deleting a subsidiary previously failed with a raw FK violation (caught and turned into a 409 by
-- V45-era application code) as soon as it had any recorded ESG data, since every company_id
-- foreign key was ON DELETE RESTRICT by design. This migration switches that to ON DELETE CASCADE
-- for all business-data tables, so removing a subsidiary now genuinely — and permanently — deletes
-- everything recorded against it: indicators, materiality assessments, governance records,
-- emissions/climate data, compliance policies, sign-off/assurance history, exports, invoices, and
-- support tickets. This is a deliberate, irreversible-by-design change; the frontend now requires
-- typing the company's name to confirm before calling delete (see CompanyTab.tsx /
-- CompanyDetailsView.tsx).
--
-- app_user.company_id is deliberately EXCLUDED and stays ON DELETE RESTRICT — cascading it would
-- silently delete people's login accounts along with the company, which is a fundamentally
-- different (and worse) failure mode than losing ESG records. The existing "reassign or remove
-- users first" guard in CompanyService.deleteSubsidiary remains in place for that reason.

ALTER TABLE tenant_indicator DROP CONSTRAINT tenant_indicator_company_id_fkey, ADD CONSTRAINT tenant_indicator_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE indicator_value DROP CONSTRAINT indicator_value_company_id_fkey, ADD CONSTRAINT indicator_value_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE indicator_audit_entry DROP CONSTRAINT indicator_audit_entry_company_id_fkey, ADD CONSTRAINT indicator_audit_entry_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE materiality_assessment DROP CONSTRAINT materiality_assessment_company_id_fkey, ADD CONSTRAINT materiality_assessment_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE materiality_score DROP CONSTRAINT materiality_score_company_id_fkey, ADD CONSTRAINT materiality_score_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE materiality_stakeholder_snapshot DROP CONSTRAINT materiality_stakeholder_snapshot_company_id_fkey, ADD CONSTRAINT materiality_stakeholder_snapshot_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE stakeholder_option DROP CONSTRAINT stakeholder_option_company_id_fkey, ADD CONSTRAINT stakeholder_option_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE governance_level DROP CONSTRAINT governance_level_company_id_fkey, ADD CONSTRAINT governance_level_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE matter_ownership DROP CONSTRAINT matter_ownership_company_id_fkey, ADD CONSTRAINT matter_ownership_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE performance_target DROP CONSTRAINT performance_target_company_id_fkey, ADD CONSTRAINT performance_target_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE business_segment DROP CONSTRAINT business_segment_company_id_fkey, ADD CONSTRAINT business_segment_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE s1_risk_opportunity DROP CONSTRAINT s1_risk_opportunity_company_id_fkey, ADD CONSTRAINT s1_risk_opportunity_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE ifrs_s1_disclosure DROP CONSTRAINT ifrs_s1_disclosure_company_id_fkey, ADD CONSTRAINT ifrs_s1_disclosure_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE ifrs_s2_disclosure DROP CONSTRAINT ifrs_s2_disclosure_company_id_fkey, ADD CONSTRAINT ifrs_s2_disclosure_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE emission_value DROP CONSTRAINT emission_value_company_id_fkey, ADD CONSTRAINT emission_value_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE emission_activity_entry DROP CONSTRAINT emission_activity_entry_company_id_fkey, ADD CONSTRAINT emission_activity_entry_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE scope3_category DROP CONSTRAINT scope3_category_company_id_fkey, ADD CONSTRAINT scope3_category_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE scope3_value DROP CONSTRAINT scope3_value_company_id_fkey, ADD CONSTRAINT scope3_value_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE sign_off_record DROP CONSTRAINT sign_off_record_company_id_fkey, ADD CONSTRAINT sign_off_record_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE sign_off_audit_entry DROP CONSTRAINT sign_off_audit_entry_company_id_fkey, ADD CONSTRAINT sign_off_audit_entry_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE export_history_item DROP CONSTRAINT export_history_item_company_id_fkey, ADD CONSTRAINT export_history_item_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE support_ticket DROP CONSTRAINT support_ticket_company_id_fkey, ADD CONSTRAINT support_ticket_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE ticket_message DROP CONSTRAINT ticket_message_company_id_fkey, ADD CONSTRAINT ticket_message_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE invoice DROP CONSTRAINT invoice_company_id_fkey, ADD CONSTRAINT invoice_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE compliance_policy DROP CONSTRAINT compliance_policy_company_id_fkey, ADD CONSTRAINT compliance_policy_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
ALTER TABLE api_token DROP CONSTRAINT api_token_company_id_fkey, ADD CONSTRAINT api_token_company_id_fkey FOREIGN KEY (company_id) REFERENCES company (id) ON DELETE CASCADE;
