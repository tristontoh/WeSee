ALTER TABLE platform_settings ADD COLUMN stripe_publishable_key VARCHAR(255);
ALTER TABLE platform_settings ADD COLUMN stripe_secret_key_encrypted VARCHAR(1000);
ALTER TABLE platform_settings ADD COLUMN stripe_webhook_secret_encrypted VARCHAR(1000);
ALTER TABLE platform_settings ADD COLUMN stripe_enabled BOOLEAN NOT NULL DEFAULT FALSE;
