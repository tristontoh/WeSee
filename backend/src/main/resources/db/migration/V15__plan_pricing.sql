-- Monthly pricing per subscription plan tier, editable via the Platform Admin "Plan Management"
-- module. Previously this only existed as a hardcoded constant in the frontend admin panel.

CREATE TABLE plan_pricing (
    plan VARCHAR(30) PRIMARY KEY CHECK (plan IN ('STARTER', 'GROWTH', 'ISSUER_READY')),
    monthly_price NUMERIC(10, 2) NOT NULL
);

INSERT INTO plan_pricing (plan, monthly_price) VALUES
    ('STARTER', 299.00),
    ('GROWTH', 699.00),
    ('ISSUER_READY', 1499.00);
