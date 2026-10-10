-- Renumbered from the design's V81: the schema had already reached V88 by the time this was
-- written, and Flyway applies by version order, so a V81 added now would never run.
--
-- The first table in this schema that names two tenants. Deliberately NOT tenant-owned: forcing
-- it under the single-tenant Hibernate filter would require disabling that filter somewhere, and
-- a codebase that has never disabled it should not start now. Every query binds the acting
-- company id explicitly instead, the way EvidenceChunkRepository.search already does.
--
-- This is not TeamInvite. A team invite lands the new user in the inviting company; a supply
-- invite lands the supplier in its OWN company. That one line is why this cannot be built by
-- extending the existing invite.

CREATE TABLE supply_link (
    id UUID PRIMARY KEY,
    buyer_company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    supplier_company_id UUID REFERENCES company (id) ON DELETE RESTRICT,
    supplier_email VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(200),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'DECLINED', 'REVOKED')),
    invite_token_hash VARCHAR(64) NOT NULL UNIQUE,
    invited_by_user_id UUID REFERENCES app_user (id) ON DELETE SET NULL,
    invited_by_name VARCHAR(200),
    invited_at TIMESTAMP NOT NULL DEFAULT now(),
    expires_at TIMESTAMP NOT NULL,
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    -- A supplier company is required once the link is live, and meaningless before.
    CONSTRAINT supply_link_supplier_present_when_active CHECK (
        status <> 'ACTIVE' OR supplier_company_id IS NOT NULL
    ),
    -- A company cannot be its own supplier: that would let it allocate its own emissions into
    -- its own Scope 3 and count the same tonnes twice, on both sides of one ledger.
    CONSTRAINT supply_link_not_self CHECK (
        supplier_company_id IS NULL OR supplier_company_id <> buyer_company_id
    )
);

-- One live link per pair. Partial index rather than a table constraint, because revoked and
-- declined history for the same pair must remain.
CREATE UNIQUE INDEX uq_supply_link_active_pair
    ON supply_link (buyer_company_id, supplier_company_id)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_supply_link_buyer ON supply_link (buyer_company_id);
CREATE INDEX idx_supply_link_supplier ON supply_link (supplier_company_id);

-- Following V58's idiom: insert the keys, do not backfill existing custom roles. COMPANY_ADMIN
-- bypasses @perm.check entirely, so admins have these immediately; a Company Admin grants them to
-- other roles in the roles screen, which is how every permission added since V54 has worked.
INSERT INTO permission (key, module, action, label, description, display_order) VALUES
    ('supply_chain.view', 'supply_chain', 'view', 'View Supply Chain',
     'View supplier links and the disclosures they have shared.', 170),
    ('supply_chain.manage', 'supply_chain', 'manage', 'Manage Supply Chain',
     'Invite suppliers, publish a signed-off year to a buyer, and allocate a supplier footprint into Scope 3.', 171);
