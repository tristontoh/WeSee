-- Subscription billing invoices, one per tenant billing cycle, managed by platform admins.
-- No seed data — this starts empty and is only populated by real billing activity.

CREATE TABLE invoice (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    invoice_number VARCHAR(30) NOT NULL UNIQUE,
    due_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PAID', 'PENDING', 'OVERDUE')),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_company ON invoice (company_id);
