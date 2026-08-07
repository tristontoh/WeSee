-- Seeds a platform admin account. There is no invite/role-assignment flow yet (register always
-- assigns COMPANY_ADMIN), so this is currently the only way to get a PLATFORM_ADMIN user to log
-- in as and exercise /admin.
--
-- Login: platform.admin@wesee.my / PlatformAdmin#2026
-- Change this password (or delete this seed) before this schema is ever used outside a sandbox.

INSERT INTO app_user (id, company_id, email, password_hash, name, role, token_version, active)
VALUES (
    gen_random_uuid(),
    NULL,
    'platform.admin@wesee.my',
    '$2a$10$8pty7TzI23fHt.3qTlkcDOZrBb59Y0/FO0suKUZEn6mEMawhsREmS',
    'WeSee Platform Admin',
    'PLATFORM_ADMIN',
    0,
    TRUE
);
