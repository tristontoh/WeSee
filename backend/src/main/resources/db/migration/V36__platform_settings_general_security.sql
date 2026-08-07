ALTER TABLE platform_settings ADD COLUMN platform_name VARCHAR(200);
ALTER TABLE platform_settings ADD COLUMN support_email VARCHAR(255);
ALTER TABLE platform_settings ADD COLUMN require_2fa BOOLEAN NOT NULL DEFAULT FALSE;
