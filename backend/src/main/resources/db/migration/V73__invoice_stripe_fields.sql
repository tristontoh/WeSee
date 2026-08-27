-- Lets StripeWebhookController record real Stripe invoices into the existing (previously
-- manual-only) invoice table on "invoice.paid", so Settings > Billing can show a real payment
-- history table. stripe_invoice_id is the upsert key (webhooks can redeliver the same event).

ALTER TABLE invoice ADD COLUMN stripe_invoice_id VARCHAR(255);
ALTER TABLE invoice ADD COLUMN description VARCHAR(500);
CREATE UNIQUE INDEX idx_invoice_stripe_invoice_id ON invoice (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
