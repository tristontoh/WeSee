-- Seeds one 'Member' custom role per existing company, reproducing today's actual default
-- non-admin behavior (every permission whose backing endpoint is NOT hasRole('COMPANY_ADMIN')-
-- gated as of this migration), then backfills custom_role_id onto every existing
-- COMPANY_CONTRIBUTOR/CONSULTANT user and pending invite so nobody silently loses access on
-- deploy. The one deliberate visibility change is api_access.view: previously non-admins could
-- reach the /api-access page but every backend call was blocked; granting api_access.view here
-- (without api_access.manage) finally makes that page usable in a read-only way, matching what
-- the frontend route already implied.

INSERT INTO custom_role (id, company_id, name, description, permission_keys)
SELECT
    gen_random_uuid(),
    c.id,
    'Member',
    'Default role for non-admin team members, seeded automatically to preserve pre-existing access.',
    'dashboard.view,materiality.view,materiality.edit,indicators.view,indicators.edit,targets.view,targets.edit,reports.view,reports.generate,governance.view,governance.edit,ifrs.view,ifrs.edit,assurance.view,assurance.signoff,api_access.view,team.view,billing.view,settings.view'
FROM company c;

UPDATE app_user u
SET custom_role_id = r.id
FROM custom_role r
WHERE r.company_id = u.company_id
  AND r.name = 'Member'
  AND u.role IN ('COMPANY_CONTRIBUTOR', 'CONSULTANT');

UPDATE team_invite i
SET custom_role_id = r.id
FROM custom_role r
WHERE r.company_id = i.company_id
  AND r.name = 'Member'
  AND i.role IN ('COMPANY_CONTRIBUTOR', 'CONSULTANT')
  AND i.accepted_at IS NULL
  AND i.revoked_at IS NULL;
