-- Feedback & Support tickets, submitted by tenant users and managed by platform admins.
-- No seed data — this starts empty and is only populated by real submissions.

CREATE TABLE support_ticket (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    submitted_by UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('FEEDBACK', 'SUPPORT_REQUEST')),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'LOW' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    status VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PENDING', 'CLOSED')),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_ticket_company ON support_ticket (company_id);
