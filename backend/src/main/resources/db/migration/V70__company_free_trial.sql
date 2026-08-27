-- Free trial: starts when a company completes onboarding (see AuthService.completeOnboarding),
-- runs 14 days, and is enforced server-side by TrialAccessFilter once expired. trial_converted is
-- the manual escape hatch a PLATFORM_ADMIN flips once a company has actually paid — there's no
-- automated Stripe charge/webhook flow yet (billing module has the keys but nothing calls them),
-- so conversion is tracked manually until that exists.

ALTER TABLE company ADD COLUMN trial_ends_at TIMESTAMP;
ALTER TABLE company ADD COLUMN trial_converted BOOLEAN NOT NULL DEFAULT false;
