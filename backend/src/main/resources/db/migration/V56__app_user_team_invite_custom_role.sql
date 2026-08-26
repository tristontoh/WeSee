-- Nullable at the DB level (COMPANY_ADMIN rows never populate it — they implicitly have every
-- permission, see PermissionGateService). "Required for non-admin roles" is an application-layer
-- invariant enforced in CompanyService, not a DB constraint.
ALTER TABLE app_user ADD COLUMN custom_role_id UUID REFERENCES custom_role (id) ON DELETE RESTRICT;
ALTER TABLE team_invite ADD COLUMN custom_role_id UUID REFERENCES custom_role (id) ON DELETE RESTRICT;
