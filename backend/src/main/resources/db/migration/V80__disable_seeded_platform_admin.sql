-- Turns off the platform admin seeded by V14.
--
-- V14 prints its own password in a comment, and frontend/e2e/fixtures.ts repeats it in plain text,
-- because it was written for a sandbox that only ever ran on a laptop. Both are correct for that
-- purpose and both stop being correct the moment this repository is read by anyone else: this
-- repository goes public during competition judging, and a hosted demo running an unmodified
-- schema would then be handing out a working PLATFORM_ADMIN credential to every reader.
--
-- V14 itself cannot be edited — Flyway checksums applied migrations — so the account is disabled
-- here instead. AuthService, JwtAuthenticationFilter and ApiTokenAuthenticationFilter each refuse
-- an inactive user, so this closes the login, any JWT already issued, and any API token.
--
-- To use /admin locally, give the account a password of your own and switch it back on. RUNNING.md
-- carries the two statements; they are deliberately not in a migration, so that no password that
-- works is ever committed again.
--
-- Bumping token_version invalidates tokens minted before this ran.

UPDATE app_user
SET active = FALSE,
    token_version = token_version + 1
WHERE email = 'platform.admin@wesee.my'
  AND role = 'PLATFORM_ADMIN';
