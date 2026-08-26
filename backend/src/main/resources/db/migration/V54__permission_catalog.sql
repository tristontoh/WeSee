-- Reference table for the permission keys a custom_role can grant (see V55). Module + action
-- grain, mirroring what's actually enforced per-controller today so the V57 backfill can
-- reproduce current default behavior exactly rather than guessing at it.

CREATE TABLE permission (
    key             VARCHAR(80) PRIMARY KEY,
    module          VARCHAR(50) NOT NULL,
    action          VARCHAR(30) NOT NULL,
    label           VARCHAR(150) NOT NULL,
    description     TEXT,
    display_order   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO permission (key, module, action, label, description, display_order) VALUES
    ('dashboard.view', 'dashboard', 'view', 'View Dashboard', 'View the workspace dashboard overview.', 10),

    ('materiality.view', 'materiality', 'view', 'View Materiality Assessments', 'View materiality assessments and stakeholder scoring.', 20),
    ('materiality.edit', 'materiality', 'edit', 'Edit Materiality Assessments', 'Create and edit materiality assessments and stakeholder options.', 21),
    ('materiality.validate', 'materiality', 'validate', 'Validate Materiality Assessments', 'Mark a materiality assessment as board/management-validated.', 22),

    ('indicators.view', 'indicators', 'view', 'View ESG Indicators', 'View ESG indicator values and targets.', 30),
    ('indicators.edit', 'indicators', 'edit', 'Edit ESG Indicators', 'Enter and edit ESG indicator values and targets.', 31),
    ('indicators.approve', 'indicators', 'approve', 'Approve ESG Indicators', 'Approve a reported indicator value (sign-off step).', 32),

    ('targets.view', 'targets', 'view', 'View Targets', 'View strategic decarbonization/performance targets.', 40),
    ('targets.edit', 'targets', 'edit', 'Edit Targets', 'Create and edit strategic performance targets.', 41),

    ('reports.view', 'reports', 'view', 'View Reports', 'View report/export history.', 50),
    ('reports.generate', 'reports', 'generate', 'Generate Reports', 'Generate and download disclosure reports and CSV exports.', 51),
    ('reports.signoff', 'reports', 'signoff', 'Sign Off Reports', 'Sign off a generated export/report.', 52),

    ('governance.view', 'governance', 'view', 'View Governance', 'View governance oversight structure and matter ownership.', 60),
    ('governance.edit', 'governance', 'edit', 'Edit Governance', 'Edit the oversight structure and matter ownership assignments.', 61),
    ('governance.manage_policies', 'governance', 'manage_policies', 'Manage Compliance Policies', 'Create, delete, and mark statutory compliance policies as reviewed.', 62),

    ('ifrs.view', 'ifrs', 'view', 'View IFRS S1/S2', 'View IFRS S1/S2 climate disclosures.', 70),
    ('ifrs.edit', 'ifrs', 'edit', 'Edit IFRS S1/S2', 'Edit IFRS S1/S2 climate disclosures.', 71),

    ('assurance.view', 'assurance', 'view', 'View Assurance Workspace', 'View fiscal-year sign-off status and audit trail.', 80),
    ('assurance.signoff', 'assurance', 'signoff', 'Sign Off Assurance', 'Sign off or revoke a fiscal year in the assurance workspace.', 81),

    ('api_access.view', 'api_access', 'view', 'View API Tokens', 'View the company''s API access tokens.', 90),
    ('api_access.manage', 'api_access', 'manage', 'Manage API Tokens', 'Create and revoke API access tokens.', 91),

    ('team.view', 'team', 'view', 'View Team', 'View the team member and pending invite list.', 100),
    ('team.manage', 'team', 'manage', 'Manage Team', 'Invite, remove, and change the role of team members.', 101),

    ('roles.view', 'roles', 'view', 'View Custom Roles', 'View the company''s custom roles and their permissions.', 110),
    ('roles.manage', 'roles', 'manage', 'Manage Custom Roles', 'Create, edit, and delete custom roles.', 111),

    ('billing.view', 'billing', 'view', 'View Billing', 'View the current subscription plan.', 120),
    ('billing.manage', 'billing', 'manage', 'Manage Billing', 'Change the company''s subscription plan.', 121),

    ('settings.view', 'settings', 'view', 'View Settings', 'View company profile, email, and privacy settings.', 130),
    ('settings.manage', 'settings', 'manage', 'Manage Settings', 'Edit company profile, subsidiaries, email settings, and privacy/data controls.', 131);
