-- Reference table for the roles app_user.role is drawn from, replacing the inline CHECK
-- constraint with real referential integrity — and registering the new SUPERADMIN role.

CREATE TABLE roles (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

INSERT INTO roles (code, name, description) VALUES
    ('COMPANY_ADMIN', 'Company Admin', 'Full access to a tenant workspace: data entry, team, billing, and settings.'),
    ('COMPANY_CONTRIBUTOR', 'Company Contributor', 'Can view and edit ESG data within a tenant workspace, but cannot manage team, billing, or settings.'),
    ('CONSULTANT', 'Consultant', 'External advisor with access to a tenant''s ESG data views, but no workspace management access.'),
    ('PLATFORM_ADMIN', 'Platform Admin', 'Operates the platform console: tenant management, reference data, billing ops, and support.'),
    ('SUPERADMIN', 'Super Admin', 'Highest platform privilege level, superseding Platform Admin.');

ALTER TABLE app_user DROP CONSTRAINT app_user_role_check;

ALTER TABLE app_user
    ADD CONSTRAINT fk_app_user_role FOREIGN KEY (role) REFERENCES roles (code) ON DELETE RESTRICT;
