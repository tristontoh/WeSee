-- Starter tier is no longer free — every plan tier now carries a real monthly price.
UPDATE plan_pricing SET monthly_price = 99.00 WHERE plan = 'STARTER';
