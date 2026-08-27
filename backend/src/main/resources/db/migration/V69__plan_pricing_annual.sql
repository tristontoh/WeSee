-- The public pricing page shows both a monthly price and a discounted monthly-equivalent price
-- when billed annually (a toggle) — previously two hardcoded numbers per plan in PricingPage.tsx.
-- Add the annual figure to plan_pricing so both come from the same admin-managed source (see
-- PlanPricingService / AdminPlansTab.tsx). Seeded equal to the existing monthly price (no
-- discount) — an admin sets the actual discounted annual price via Plan Management.

ALTER TABLE plan_pricing ADD COLUMN annual_monthly_price NUMERIC(10, 2);
UPDATE plan_pricing SET annual_monthly_price = monthly_price WHERE annual_monthly_price IS NULL;
ALTER TABLE plan_pricing ALTER COLUMN annual_monthly_price SET NOT NULL;
