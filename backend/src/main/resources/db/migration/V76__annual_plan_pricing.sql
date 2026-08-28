-- Real annual pricing. V69 added the column and seeded it equal to the monthly price as a
-- placeholder, which left the public pricing page's monthly/annual toggle switching between two
-- identical numbers.
--
-- The discount is two months free: a year costs ten months, and the page shows that spread back
-- over twelve (699 -> 5,830 per ten months -> 583 shown per month, 6,996 for the year). Rounded to
-- whole ringgit, so nothing on the page carries stray cents.
--
-- Also restores STARTER to the 99.00 that V49 set. Some databases hold a lower figure from an
-- edit made in Plan Management; 99.00 is the intended price.
--
-- These are defaults, not a lock: Platform Admin -> Plan Management still owns both figures, and
-- an edit there survives until the next migration touches this table.

UPDATE plan_pricing SET monthly_price = 99.00 WHERE plan = 'STARTER';

UPDATE plan_pricing SET annual_monthly_price = 83.00   WHERE plan = 'STARTER';
UPDATE plan_pricing SET annual_monthly_price = 583.00  WHERE plan = 'GROWTH';
UPDATE plan_pricing SET annual_monthly_price = 1249.00 WHERE plan = 'ISSUER_READY';
