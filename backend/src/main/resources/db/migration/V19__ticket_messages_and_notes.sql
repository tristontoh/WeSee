-- Shared note on a ticket, visible to both the company and the platform admin handling it.
ALTER TABLE support_ticket ADD COLUMN note TEXT;

-- 1:1 threaded communication between the ticket's company users and platform admins.
CREATE TABLE ticket_message (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    ticket_id UUID NOT NULL REFERENCES support_ticket (id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_message_ticket ON ticket_message (ticket_id);
CREATE INDEX idx_ticket_message_company ON ticket_message (company_id);
