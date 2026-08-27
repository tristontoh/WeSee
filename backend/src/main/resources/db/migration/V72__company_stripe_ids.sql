-- Links a company to its Stripe customer/subscription once they've actually paid (see
-- CompanyBillingService.confirmCheckout), so the webhook handler (StripeWebhookController) knows
-- which company a "customer.subscription.deleted" event belongs to and can revoke access again.

ALTER TABLE company ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE company ADD COLUMN stripe_subscription_id VARCHAR(255);

CREATE INDEX idx_company_stripe_customer_id ON company (stripe_customer_id);
