-- V72 only sets trial_ends_at going forward, from AuthService.completeOnboarding — every company
-- that had already finished onboarding before this feature shipped was left with a null
-- trial_ends_at (so the Billing page's countdown never renders, and TrialAccessFilter never
-- blocks them, since both treat null as "no trial to track"). Backfill a fresh 14-day window from
-- today rather than computing from their original onboarding date, which for older accounts would
-- already be in the past and would instantly lock them out the moment this migration runs.

UPDATE company
SET trial_ends_at = now() + interval '14 days'
WHERE onboarding_completed = true AND trial_ends_at IS NULL;
