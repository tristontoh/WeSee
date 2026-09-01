-- Consecutive failed sign-in attempts, and the instant the account starts accepting them again.
-- Both are cleared by a successful sign-in. A null locked_until means not locked; a past one means
-- the lock has run out and the next attempt clears it, so nothing has to sweep the table.
ALTER TABLE app_user ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_user ADD COLUMN locked_until TIMESTAMP;
