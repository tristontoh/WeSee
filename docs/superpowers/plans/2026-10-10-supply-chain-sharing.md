# Supply Chain Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a buyer source its Scope 3 Category 1 from suppliers' already-signed-off Scope 1 and 2, instead of estimating it from spend.

**Architecture:** Four tables across three migrations. `supply_link` names two tenants and is the only route between them. `shared_disclosure` is a snapshot of a signed-off fiscal year, published by the supplier; `scope3_allocation` is the buyer's own tenant-owned record of what it drew. The two shared tables deliberately sit outside the Hibernate `companyFilter`, with the acting company id bound explicitly in every query — the same shape `EvidenceChunkRepository.search` already uses.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Flyway, JPA/Hibernate, JUnit 5, React 19 + Vite 6 + TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-10-supply-chain-sharing-design.md`

**Independent of** the denominator and derived-indicator plans, except that both want `PRODUCTION_OUTPUT` as an allocation basis. If the denominator plan landed first, read the basis from `company_annual_figure`; if not, take it on the publish request. Task 4 Step 1 decides this by looking.

## Global Constraints

- Copyright header on every new `.java` / `.ts` / `.tsx` file:
  ```
  /*
   * Copyright (c) 2026 Triston Toh. All rights reserved.
   * See LICENSE at the repository root — visibility is not a licence to use.
   */
  ```
- Migration versions V81, V82, V83 — **check `ls backend/src/main/resources/db/migration/ | sort -V | tail -3` first.** If the denominator plan already used V84–V87, these still slot in below it; Flyway applies by version order, so a later-written V81 on a database already at V87 will *not* run. If any V8x above 80 already exists in the database, renumber these three to the next free versions and say so in each file's comment.
- **Nothing calls `session.disableFilter`.** The two shared tables are outside the filter by design, not by exception. A codebase that has never disabled that filter does not start now.
- `shared_disclosure` and `shared_disclosure_line` must **not** extend `TenantOwnedEntity`. They belong to two companies at once.
- Every repository method on a shared table takes the acting company id as a parameter and binds it in the query. **There is no method that reads by id alone.**
- `ddl-auto: validate` — entity fields must match columns exactly.
- Tests are plain JUnit 5 with no Spring context, matching `UnitConverterTest`, except the isolation test in Task 7 which needs a repository.
- Build: `cd backend && mvn -q compile`. Tests: `cd backend && mvn -q test -Dtest=ClassName`.

## Review Focus

Five things the spec implies but no obvious task tests. Each has its test assigned to the owning task.

1. **A buyer invites an email that already belongs to a user in the buyer's own company.** Self-linking would let a company allocate its own emissions into its own Scope 3 and double-count them. Expect a refusal. → Task 2.
2. **A supplier accepts an invite twice, or after revocation.** The token is single-use; a replay must not create a second active link or resurrect a revoked one. → Task 2.
3. **A buyer's purchased quantity exceeds the supplier's published basis.** Buying more than the supplier produced is impossible; silently clamping the share to 100% would hand the buyer the supplier's entire footprint. Expect a refusal naming both numbers. → Task 6.
4. **An emission factor is edited after a disclosure was published.** The published line must keep the factor value it was signed under. → Task 5.
5. **A supplier republishes a year the buyer has already allocated from.** The buyer's allocation must keep pointing at the snapshot it used, and the UI must say a newer one exists. → Task 6.

---

### Task 1: The supply link

**Files:**
- Create: `backend/src/main/resources/db/migration/V81__supply_link.sql`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SupplyLink.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SupplyLinkStatus.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SupplyLinkRepository.java`

**Interfaces:**
- Consumes: `com.wesee.esg.common.BaseEntity` (**not** `TenantOwnedEntity`)
- Produces: `SupplyLinkStatus` (`PENDING`, `ACTIVE`, `DECLINED`, `REVOKED`); `SupplyLink` entity; `SupplyLinkRepository` with `findByBuyerCompanyId(UUID)`, `findBySupplierCompanyId(UUID)`, `findByIdAndBuyerCompanyId(UUID, UUID)`, `findByIdAndSupplierCompanyId(UUID, UUID)`, `findByInviteTokenHash(String)`, `existsByBuyerCompanyIdAndSupplierCompanyIdAndStatus(UUID, UUID, SupplyLinkStatus)`

- [ ] **Step 1: Check the free migration versions**

Run: `ls backend/src/main/resources/db/migration/ | sort -V | tail -3`

If V84 or higher exists, use the next three free versions instead of V81–V83 throughout this plan, and note the renumbering in each migration's header comment. Flyway will not run a version below the schema's current high-water mark.

- [ ] **Step 2: Write the migration**

`backend/src/main/resources/db/migration/V81__supply_link.sql`:

```sql
-- The first table in this schema that names two tenants. Deliberately NOT tenant-owned: forcing
-- it under the single-tenant Hibernate filter would require disabling that filter somewhere, and
-- a codebase that has never disabled it should not start now. Every query binds the acting
-- company id explicitly instead, the way EvidenceChunkRepository.search already does.
--
-- This is not TeamInvite. A team invite lands the new user in the inviting company; a supply
-- invite lands the supplier in its OWN new company. That one line is why this cannot be built by
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
    -- its own Scope 3 and count the same tonnes twice.
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
```

- [ ] **Step 3: Write the status enum and entity**

`SupplyLinkStatus.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

public enum SupplyLinkStatus {
    /** Invited, not yet answered. No data crosses in this state. */
    PENDING,
    /** Both companies exist and agreed. The only state in which a disclosure can be read. */
    ACTIVE,
    DECLINED,
    /** Withdrawn by either side. Kept rather than deleted, so the history stays legible. */
    REVOKED
}
```

`SupplyLink.java` — extends `BaseEntity` (check what `BaseEntity` provides with `cat backend/src/main/java/com/wesee/esg/common/BaseEntity.java`; it carries `id` and the timestamps). Fields: `UUID buyerCompanyId` (`buyer_company_id`, nullable = false, updatable = false), `UUID supplierCompanyId` (`supplier_company_id`), `String supplierEmail` (255, nullable = false), `String supplierName` (200), `SupplyLinkStatus status` (`@Enumerated(EnumType.STRING)`, 20, nullable = false), `String inviteTokenHash` (`invite_token_hash`, 64, nullable = false, unique = true), `UUID invitedByUserId`, `String invitedByName`, `Instant invitedAt`, `Instant expiresAt`, `Instant respondedAt`.

Class javadoc:

```java
/**
 * A link between a buyer and one of its suppliers. Not {@link com.wesee.esg.common.TenantOwnedEntity}:
 * it belongs to two companies at once, and the single-tenant Hibernate filter has no sensible
 * answer for that. Isolation is enforced instead by {@link SupplyLinkRepository} binding the
 * acting company id in every query — there is no finder that reads by id alone.
 */
```

- [ ] **Step 4: Write the repository**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Every method names the acting company. There is deliberately no {@code findById} here: this
 * table is outside the tenant filter, so an id-only lookup would be a cross-tenant read with
 * nothing standing in its way.
 */
public interface SupplyLinkRepository extends JpaRepository<SupplyLink, UUID> {

    List<SupplyLink> findByBuyerCompanyIdOrderByInvitedAtDesc(UUID buyerCompanyId);

    List<SupplyLink> findBySupplierCompanyIdOrderByInvitedAtDesc(UUID supplierCompanyId);

    Optional<SupplyLink> findByIdAndBuyerCompanyId(UUID id, UUID buyerCompanyId);

    Optional<SupplyLink> findByIdAndSupplierCompanyId(UUID id, UUID supplierCompanyId);

    /** The one finder without a company id, because accepting an invite is how a company joins. */
    Optional<SupplyLink> findByInviteTokenHash(String inviteTokenHash);

    boolean existsByBuyerCompanyIdAndSupplierCompanyIdAndStatus(
            UUID buyerCompanyId, UUID supplierCompanyId, SupplyLinkStatus status);
}
```

- [ ] **Step 5: Compile**

Run: `cd backend && mvn -q compile`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V81__supply_link.sql \
        backend/src/main/java/com/wesee/esg/supplychain/
git commit -m "feat(supplychain): the link between two tenants

The first table in this schema naming two companies. Outside the
Hibernate tenant filter by design, not by exception: every finder takes
the acting company id, and there is no findById to leak through."
```

---

### Task 2: Inviting and accepting

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SupplyLinkService.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SupplyLinkController.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/InviteGuard.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/dto/SupplyLinkDto.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/dto/InviteSupplierRequest.java`
- Test: `backend/src/test/java/com/wesee/esg/supplychain/InviteGuardTest.java`

**Interfaces:**
- Consumes: `SupplyLinkRepository`, `CurrentUserProvider`, `AppUserRepository`, `EmailService` (confirm its send signature with `grep -n "public" backend/src/main/java/com/wesee/esg/email/EmailService.java`)
- Produces: `InviteGuard.requireInvitable(UUID buyerCompanyId, UUID emailOwnerCompanyId)` → void, throws `IllegalArgumentException`; `InviteGuard.requireAcceptable(SupplyLink link, Instant now)` → void, throws `ConflictException`; `SupplyLinkService.invite(InviteSupplierRequest)`, `.listAsBuyer()`, `.listAsSupplier()`, `.accept(String rawToken, UUID acceptingCompanyId)`, `.decline(String rawToken)`, `.revoke(UUID linkId)`

This task carries Review Focus items 1 and 2.

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/wesee/esg/supplychain/InviteGuardTest.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.common.exceptions.ConflictException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InviteGuardTest {

    private static final Instant NOW = Instant.parse("2026-10-10T00:00:00Z");

    private static SupplyLink link(SupplyLinkStatus status, Instant expiresAt) {
        SupplyLink l = new SupplyLink();
        l.setStatus(status);
        l.setExpiresAt(expiresAt);
        l.setBuyerCompanyId(UUID.randomUUID());
        return l;
    }

    @Test
    void invitingAStrangerIsFine() {
        assertDoesNotThrow(() -> InviteGuard.requireInvitable(UUID.randomUUID(), UUID.randomUUID()));
    }

    @Test
    void invitingAnEmailThatBelongsToNobodyYetIsFine() {
        assertDoesNotThrow(() -> InviteGuard.requireInvitable(UUID.randomUUID(), null));
    }

    /**
     * Review Focus 1. A company that linked to itself could allocate its own emissions into its
     * own Scope 3 and count the same tonnes twice — on both sides of its own ledger.
     */
    @Test
    void invitingSomebodyInYourOwnCompanyIsRefused() {
        UUID own = UUID.randomUUID();
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> InviteGuard.requireInvitable(own, own));
        assertTrue(e.getMessage().toLowerCase().contains("own company"), e.getMessage());
    }

    @Test
    void aPendingUnexpiredInviteIsAcceptable() {
        assertDoesNotThrow(() -> InviteGuard.requireAcceptable(
                link(SupplyLinkStatus.PENDING, NOW.plus(7, ChronoUnit.DAYS)), NOW));
    }

    /** Review Focus 2. The token is single-use; a replay must not create a second live link. */
    @Test
    void anAlreadyAcceptedInviteCannotBeAcceptedAgain() {
        ConflictException e = assertThrows(ConflictException.class, () -> InviteGuard.requireAcceptable(
                link(SupplyLinkStatus.ACTIVE, NOW.plus(7, ChronoUnit.DAYS)), NOW));
        assertTrue(e.getMessage().toLowerCase().contains("already"), e.getMessage());
    }

    @Test
    void aRevokedInviteCannotBeResurrected() {
        assertThrows(ConflictException.class, () -> InviteGuard.requireAcceptable(
                link(SupplyLinkStatus.REVOKED, NOW.plus(7, ChronoUnit.DAYS)), NOW));
    }

    @Test
    void aDeclinedInviteCannotBeAccepted() {
        assertThrows(ConflictException.class, () -> InviteGuard.requireAcceptable(
                link(SupplyLinkStatus.DECLINED, NOW.plus(7, ChronoUnit.DAYS)), NOW));
    }

    @Test
    void anExpiredInviteIsRefusedAndSaysSo() {
        ConflictException e = assertThrows(ConflictException.class, () -> InviteGuard.requireAcceptable(
                link(SupplyLinkStatus.PENDING, NOW.minus(1, ChronoUnit.DAYS)), NOW));
        assertTrue(e.getMessage().toLowerCase().contains("expired"), e.getMessage());
    }

    @Test
    void anInviteExpiringThisInstantIsStillAcceptable() {
        assertDoesNotThrow(() -> InviteGuard.requireAcceptable(
                link(SupplyLinkStatus.PENDING, NOW), NOW));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=InviteGuardTest`
Expected: FAIL — `InviteGuard` does not exist.

- [ ] **Step 3: Write `InviteGuard`**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.common.exceptions.ConflictException;

import java.time.Instant;
import java.util.UUID;

/** When a supply invite may be sent, and when it may be answered. Pure, so it is testable. */
public final class InviteGuard {

    private InviteGuard() {
    }

    /**
     * @param emailOwnerCompanyId the company of the existing user behind the invited address, or
     *                            null when nobody holds it yet
     */
    public static void requireInvitable(UUID buyerCompanyId, UUID emailOwnerCompanyId) {
        if (emailOwnerCompanyId != null && emailOwnerCompanyId.equals(buyerCompanyId)) {
            throw new IllegalArgumentException(
                    "That address belongs to your own company. A supply link records what you bought"
                            + " from someone else; linking to yourself would count the same emissions"
                            + " on both sides of your own ledger.");
        }
    }

    public static void requireAcceptable(SupplyLink link, Instant now) {
        if (link.getStatus() != SupplyLinkStatus.PENDING) {
            throw new ConflictException(switch (link.getStatus()) {
                case ACTIVE -> "This invitation has already been accepted";
                case DECLINED -> "This invitation was already declined";
                case REVOKED -> "This invitation was withdrawn";
                default -> "This invitation cannot be accepted";
            });
        }
        if (now.isAfter(link.getExpiresAt())) {
            throw new ConflictException("This invitation expired on " + link.getExpiresAt()
                    + " — ask the buyer to send a new one");
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=InviteGuardTest`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write the DTOs, service and controller**

`InviteSupplierRequest` — record of `@NotBlank @Email @Size(max = 255) String supplierEmail, @Size(max = 200) String supplierName`.

`SupplyLinkDto` — record of `UUID id, String counterpartyName, String counterpartyEmail, SupplyLinkStatus status, Instant invitedAt, Instant respondedAt, boolean actingAsBuyer`, with a static `from(SupplyLink, boolean actingAsBuyer, String counterpartyName)`.

`SupplyLinkService`:

- `invite` — `requireCompanyId()`, look up whether `supplierEmail` already belongs to an `AppUser` and pass that user's company id to `InviteGuard.requireInvitable`; generate a random token with `SecureRandom`, store only its SHA-256 hex in `invite_token_hash`, send the raw token by email. Read `CompanyService`'s team-invite path first and match how it generates, hashes and mails a token — do not invent a second scheme.
- `accept(String rawToken, UUID acceptingCompanyId)` — hash the token, find the link, `InviteGuard.requireAcceptable`, then set `supplierCompanyId` and `ACTIVE`. The accepting company is the caller's own, which for a brand-new supplier is the company created by ordinary registration. **Registration is unchanged**: the supplier signs up normally and then accepts, rather than the invite creating a company.
- `revoke(UUID linkId)` — findByIdAndBuyerCompanyId, set `REVOKED` and `respondedAt`. Does not delete.

`SupplyLinkController` at `/api/v1/supply-chain/links`:

- `GET /as-buyer` → `listAsBuyer`
- `GET /as-supplier` → `listAsSupplier`
- `POST /invite` → `invite`
- `POST /accept/{token}` → `accept`
- `POST /decline/{token}` → `decline`
- `DELETE /{linkId}` → `revoke`

- [ ] **Step 6: Add the permission keys**

Supply chain needs its own two. Add to `V81__supply_link.sql` (same migration — a permission the table needs is part of the table's change):

```sql
INSERT INTO permission (key, module, action, label, description, display_order) VALUES
    ('supply_chain.view', 'supply_chain', 'view', 'View Supply Chain', 'View supplier links and the disclosures they have shared.', 90),
    ('supply_chain.manage', 'supply_chain', 'manage', 'Manage Supply Chain', 'Invite suppliers, publish disclosures and allocate a supplier footprint into Scope 3.', 91);

-- Grant view to every existing non-admin role, matching how V58 widened the AI permissions.
UPDATE custom_role
SET permission_keys = permission_keys || ',supply_chain.view'
WHERE permission_keys NOT LIKE '%supply_chain.view%';
```

Check `V58__ai_permissions.sql` first and copy its exact grant idiom — `display_order` values and the `permission_keys` update must match what that migration did, or the settings screen will order the new rows oddly.

Annotate the controller: `@PreAuthorize("@perm.check('supply_chain.view')")` on reads, `('supply_chain.manage')` on writes. The accept and decline endpoints are the exception — they are reached by a supplier who is not yet linked, so they authenticate but check no supply-chain permission.

- [ ] **Step 7: Compile and commit**

Run: `cd backend && mvn -q compile`

```bash
git add backend/src/main/java/com/wesee/esg/supplychain/ \
        backend/src/test/java/com/wesee/esg/supplychain/ \
        backend/src/main/resources/db/migration/V81__supply_link.sql
git commit -m "feat(supplychain): invite a supplier, accept the link

A supplier registers its own company and then accepts — the invite does
not create a company inside the buyer's tenant, which is the single line
that separates this from TeamInvite.

Self-linking is refused: it would count the same tonnes on both sides of
one company's own ledger."
```

---

### Task 3: The shared disclosure tables

**Files:**
- Create: `backend/src/main/resources/db/migration/V82__shared_disclosure.sql`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SharedDisclosure.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SharedDisclosureLine.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SharedDisclosureRepository.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SharedDisclosureLineRepository.java`

**Interfaces:**
- Consumes: `BaseEntity`, `SupplyLink`
- Produces: `SharedDisclosureRepository.findPublishedForBuyer(UUID buyerCompanyId)`, `.findForSupplier(UUID supplierCompanyId)`, `.findByIdForBuyer(UUID id, UUID buyerCompanyId)`, `.findByIdForSupplier(UUID id, UUID supplierCompanyId)`; `SharedDisclosureLineRepository.findByDisclosureIdOrderByScopeAsc(UUID)`

- [ ] **Step 1: Write the migration**

`backend/src/main/resources/db/migration/V82__shared_disclosure.sql`:

```sql
-- A supplier's signed-off year, snapshotted for one buyer. Not tenant-owned; reached only
-- through a supply_link, and every query binds the acting company id.
--
-- Only the number and its attestation cross the boundary. The supplier's documents do not: a TNB
-- bill carries an account number, a service address and a tariff band, none of which is the
-- carbon number. An assurer who needs the original asks the supplier, as it would today.
--
-- But the CALCULATION does cross. Emission factors are public reference data, so 977.35 tCO2e
-- divided by a published 0.585 kgCO2e/kWh returns the consumption in one step. Hiding what cannot
-- be hidden would only cost the buyer the ability to show an assurer how the number was derived.

CREATE TABLE shared_disclosure (
    id UUID PRIMARY KEY,
    supply_link_id UUID NOT NULL REFERENCES supply_link (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    scope1_tco2e NUMERIC(18, 4) NOT NULL,
    scope2_tco2e NUMERIC(18, 4) NOT NULL,
    -- The denominator the buyer divides by: "977.35 tCO2e against 48,000 units produced".
    basis_quantity NUMERIC(18, 4) NOT NULL,
    basis_unit VARCHAR(30) NOT NULL,
    -- Copied from sign_off_record at publish time, not referenced. A sign-off is a point-in-time
    -- attestation and the snapshot inherits that semantic.
    sign_off_hash VARCHAR(64) NOT NULL,
    signer_name VARCHAR(200) NOT NULL,
    signed_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT now(),
    revoked_at TIMESTAMP,
    revocation_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT shared_disclosure_basis_positive CHECK (basis_quantity > 0)
);

CREATE INDEX idx_shared_disclosure_link ON shared_disclosure (supply_link_id, fiscal_year);

CREATE TABLE shared_disclosure_line (
    id UUID PRIMARY KEY,
    disclosure_id UUID NOT NULL REFERENCES shared_disclosure (id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL,
    emission_factor_id VARCHAR(50) NOT NULL,
    emission_factor_name VARCHAR(200) NOT NULL,
    quantity NUMERIC(18, 4) NOT NULL,
    activity_unit VARCHAR(30) NOT NULL,
    -- Copied, not referenced. When MGTC publishes a 2025 edition the reference table changes, and
    -- a disclosure signed under the 2024 factor must keep reporting what was signed.
    factor_value NUMERIC(18, 6) NOT NULL,
    factor_source VARCHAR(200) NOT NULL,
    factor_source_year INTEGER,
    tco2e NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_disclosure_line_disclosure ON shared_disclosure_line (disclosure_id);
```

Check `emission_factor.factor_value`'s precision with `grep -n "factor_value" backend/src/main/resources/db/migration/*.sql` and match it exactly here rather than assuming `(18,6)`.

- [ ] **Step 2: Write the entities**

`SharedDisclosure` extends `BaseEntity` — `UUID supplyLinkId`, `Integer fiscalYear`, `BigDecimal scope1Tco2e`, `BigDecimal scope2Tco2e`, `BigDecimal basisQuantity`, `String basisUnit`, `String signOffHash`, `String signerName`, `Instant signedAt`, `Instant publishedAt`, `Instant revokedAt`, `String revocationReason`.

`SharedDisclosureLine` extends `BaseEntity` — `UUID disclosureId`, `String scope`, `String emissionFactorId`, `String emissionFactorName`, `BigDecimal quantity`, `String activityUnit`, `BigDecimal factorValue`, `String factorSource`, `Integer factorSourceYear`, `BigDecimal tco2e`.

Both carry the same "not tenant-owned, reached only through a link" javadoc as `SupplyLink`.

- [ ] **Step 3: Write the repositories with explicit binding**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * This table is outside the Hibernate tenant filter, so the join to {@code supply_link} and the
 * company-id predicate below ARE the isolation. Every method here binds the acting company. A
 * finder that reads by id alone would be a cross-tenant read with nothing standing in its way —
 * do not add one.
 */
public interface SharedDisclosureRepository extends JpaRepository<SharedDisclosure, UUID> {

    @Query("""
            SELECT d FROM SharedDisclosure d, SupplyLink l
             WHERE l.id = d.supplyLinkId
               AND l.buyerCompanyId = :buyerCompanyId
               AND l.status = com.wesee.esg.supplychain.SupplyLinkStatus.ACTIVE
               AND d.revokedAt IS NULL
             ORDER BY d.fiscalYear DESC, d.publishedAt DESC
            """)
    List<SharedDisclosure> findPublishedForBuyer(@Param("buyerCompanyId") UUID buyerCompanyId);

    @Query("""
            SELECT d FROM SharedDisclosure d, SupplyLink l
             WHERE l.id = d.supplyLinkId
               AND l.supplierCompanyId = :supplierCompanyId
             ORDER BY d.fiscalYear DESC, d.publishedAt DESC
            """)
    List<SharedDisclosure> findForSupplier(@Param("supplierCompanyId") UUID supplierCompanyId);

    @Query("""
            SELECT d FROM SharedDisclosure d, SupplyLink l
             WHERE l.id = d.supplyLinkId
               AND d.id = :id
               AND l.buyerCompanyId = :buyerCompanyId
               AND l.status = com.wesee.esg.supplychain.SupplyLinkStatus.ACTIVE
            """)
    Optional<SharedDisclosure> findByIdForBuyer(@Param("id") UUID id,
                                                @Param("buyerCompanyId") UUID buyerCompanyId);

    @Query("""
            SELECT d FROM SharedDisclosure d, SupplyLink l
             WHERE l.id = d.supplyLinkId
               AND d.id = :id
               AND l.supplierCompanyId = :supplierCompanyId
            """)
    Optional<SharedDisclosure> findByIdForSupplier(@Param("id") UUID id,
                                                   @Param("supplierCompanyId") UUID supplierCompanyId);
}
```

`SharedDisclosureLineRepository` — `List<SharedDisclosureLine> findByDisclosureIdOrderByScopeAsc(UUID disclosureId)`. Lines are only ever loaded for a disclosure the caller already proved it may read, so this one takes no company id; say so in a comment.

- [ ] **Step 4: Compile and commit**

Run: `cd backend && mvn -q compile`

```bash
git add backend/src/main/resources/db/migration/V82__shared_disclosure.sql backend/src/main/java/com/wesee/esg/supplychain/
git commit -m "feat(supplychain): the snapshot a supplier publishes

Factor values are copied, not referenced: when MGTC publishes a 2025
edition, a disclosure signed under the 2024 factor must keep reporting
what was signed."
```

---

### Task 4: Publishing (supplier side)

**Files:**
- Create: `backend/src/main/java/com/wesee/esg/supplychain/PublishGuard.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SharedDisclosureService.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/dto/PublishDisclosureRequest.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/dto/SharedDisclosureDto.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/dto/SharedDisclosureLineDto.java`
- Modify: `backend/src/main/java/com/wesee/esg/supplychain/SupplyLinkController.java` (or a new `SharedDisclosureController`)
- Test: `backend/src/test/java/com/wesee/esg/supplychain/PublishGuardTest.java`

**Interfaces:**
- Consumes: `SignOffRecordRepository`, `SignOffStatus`, `EmissionActivityEntryRepository`, `SharedDisclosureRepository`, `SupplyLinkRepository`
- Produces: `PublishGuard.requirePublishable(SignOffRecord orNull, int fiscalYear)` → void, throws `ConflictException`; `SharedDisclosureService.publish(UUID linkId, PublishDisclosureRequest)`, `.listMine()`, `.revoke(UUID disclosureId, String reason)`

This task carries Review Focus item 4 (via the snapshot copy) — the test for it is in Task 5.

- [ ] **Step 1: Decide where the basis comes from**

Run: `ls backend/src/main/java/com/wesee/esg/denominator/ 2>/dev/null`

If `AnnualFigureKey` exists, the publish flow reads `PRODUCTION_OUTPUT` from `company_annual_figure` for that fiscal year and uses it as the default basis, with the request able to override. If not, `PublishDisclosureRequest` carries `basisQuantity` and `basisUnit` directly. Write which you found into `SharedDisclosureService`'s javadoc.

- [ ] **Step 2: Write the failing test**

`backend/src/test/java/com/wesee/esg/supplychain/PublishGuardTest.java`:

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.assurance.SignOffRecord;
import com.wesee.esg.assurance.SignOffStatus;
import com.wesee.esg.common.exceptions.ConflictException;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PublishGuardTest {

    private static SignOffRecord signOff(SignOffStatus status) {
        SignOffRecord r = new SignOffRecord();
        r.setFiscalYear(2025);
        r.setStatus(status);
        r.setHash("a".repeat(64));
        r.setSignerName("Jane Lim");
        r.setSignedAt(Instant.parse("2026-01-15T00:00:00Z"));
        return r;
    }

    @Test
    void aSignedYearMayBePublished() {
        assertDoesNotThrow(() -> PublishGuard.requirePublishable(signOff(SignOffStatus.SIGNED_OFF), 2025));
    }

    @Test
    void anUnsignedYearHasNothingToAttestAndIsRefused() {
        ConflictException e = assertThrows(ConflictException.class,
                () -> PublishGuard.requirePublishable(null, 2025));
        assertTrue(e.getMessage().toLowerCase().contains("sign"), e.getMessage());
        assertTrue(e.getMessage().contains("2025"), e.getMessage());
    }

    @Test
    void aRevokedSignOffIsRefused() {
        ConflictException e = assertThrows(ConflictException.class,
                () -> PublishGuard.requirePublishable(signOff(SignOffStatus.REVOKED), 2025));
        assertTrue(e.getMessage().toLowerCase().contains("revok"), e.getMessage());
    }

    @Test
    void aSignOffWithoutAHashIsRefusedBecauseThereIsNothingToAttestWith() {
        SignOffRecord r = signOff(SignOffStatus.SIGNED_OFF);
        r.setHash(null);
        assertThrows(ConflictException.class, () -> PublishGuard.requirePublishable(r, 2025));
    }
}
```

**Before writing this test, confirm `SignOffStatus`'s actual constants** with `cat backend/src/main/java/com/wesee/esg/assurance/SignOffStatus.java` and use the real names. `SIGNED_OFF` and `REVOKED` above are the expected shape, not verified names.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=PublishGuardTest`
Expected: FAIL — `PublishGuard` does not exist.

- [ ] **Step 4: Write `PublishGuard` and the service**

`PublishGuard.requirePublishable` refuses a null record, a non-signed status and a blank hash, each with its own sentence naming the fiscal year.

`SharedDisclosureService.publish(UUID linkId, PublishDisclosureRequest request)`:

1. `requireCompanyId()`, `supplyLinkRepository.findByIdAndSupplierCompanyId(linkId, companyId)` — a link the caller is not the *supplier* of is a `NotFoundException`, not a `ForbiddenException`: telling a stranger that a link exists is itself a leak.
2. Refuse unless the link is `ACTIVE`.
3. Load the sign-off for that fiscal year and call `PublishGuard.requirePublishable`.
4. Sum the company's `EmissionActivityEntry` rows for the year into scope 1 and scope 2 totals, reading the scope off each entry's `EmissionFactor`.
5. Create the `SharedDisclosure`, copying `hash`, `signerName`, `signedAt` off the sign-off record.
6. Create one `SharedDisclosureLine` per entry, **copying** `factorValue`, `source` and `sourceYear` off the factor. Never store the factor id alone.
7. If a non-revoked disclosure already exists for this link and year, revoke it with the reason "Superseded by a newer publication" and publish the new one — re-signing produces a new snapshot rather than mutating the old.

`revoke(UUID disclosureId, String reason)` sets `revokedAt` and `revocationReason`. It does not delete: a buyer must be able to see that what it cited has been withdrawn.

The controller endpoints, under `/api/v1/supply-chain`:

- `GET /disclosures/mine` → `listMine` (supplier's own published snapshots)
- `POST /links/{linkId}/publish` → `publish`
- `DELETE /disclosures/{disclosureId}` → `revoke`

All `@PreAuthorize("@perm.check('supply_chain.manage')")` except the GET, which takes `('supply_chain.view')`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=PublishGuardTest`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/supplychain/ backend/src/test/java/com/wesee/esg/supplychain/
git commit -m "feat(supplychain): publish a signed-off year to one buyer

An unsigned year has nothing to attest, so it cannot be published.
Re-signing produces a new snapshot and revokes the old one rather than
mutating it — the figure a buyer cited last quarter does not change
underneath its own audit trail."
```

---

### Task 5: Snapshot immutability

**Files:**
- Test: `backend/src/test/java/com/wesee/esg/supplychain/SnapshotCopyTest.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/SnapshotCopy.java`

**Interfaces:**
- Consumes: `EmissionActivityEntry`, `EmissionFactor`, `SharedDisclosureLine`
- Produces: `SnapshotCopy.lineFrom(EmissionActivityEntry entry, UUID disclosureId)` → `SharedDisclosureLine`

This task carries Review Focus item 4.

- [ ] **Step 1: Write the failing test**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.climate.EmissionActivityEntry;
import com.wesee.esg.reference.EmissionFactor;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SnapshotCopyTest {

    private static EmissionActivityEntry entry() {
        EmissionFactor factor = new EmissionFactor();
        factor.setId("MY-GRID-2024");
        factor.setName("Malaysia grid electricity");
        factor.setActivityUnit("kWh");
        factor.setFactorValue(new BigDecimal("0.585000"));
        factor.setSource("MGTC LCOS");
        factor.setSourceYear(2024);

        EmissionActivityEntry e = new EmissionActivityEntry();
        e.setFiscalYear(2025);
        e.setEmissionFactor(factor);
        e.setQuantity(new BigDecimal("912446.0000"));
        e.setCalculatedTco2e(new BigDecimal("533.7809"));
        return e;
    }

    @Test
    void theLineCarriesTheFactorValueNotJustItsId() {
        SharedDisclosureLine line = SnapshotCopy.lineFrom(entry(), UUID.randomUUID());
        assertEquals(new BigDecimal("0.585000"), line.getFactorValue());
        assertEquals("MGTC LCOS", line.getFactorSource());
        assertEquals(2024, line.getFactorSourceYear());
    }

    @Test
    void theLineCarriesTheQuantityAndTheResult() {
        SharedDisclosureLine line = SnapshotCopy.lineFrom(entry(), UUID.randomUUID());
        assertEquals(new BigDecimal("912446.0000"), line.getQuantity());
        assertEquals(new BigDecimal("533.7809"), line.getTco2e());
        assertEquals("kWh", line.getActivityUnit());
    }

    /**
     * Review Focus 4. The whole point of copying rather than referencing: when MGTC publishes a
     * 2025 edition and the reference row is edited, a line signed under the 2024 factor must keep
     * reporting 0.585.
     */
    @Test
    void editingTheFactorAfterwardsDoesNotChangeThePublishedLine() {
        EmissionActivityEntry e = entry();
        SharedDisclosureLine line = SnapshotCopy.lineFrom(e, UUID.randomUUID());

        e.getEmissionFactor().setFactorValue(new BigDecimal("0.774000"));
        e.getEmissionFactor().setSourceYear(2025);

        assertEquals(new BigDecimal("0.585000"), line.getFactorValue());
        assertEquals(2024, line.getFactorSourceYear());
    }

    @Test
    void theLineRecordsWhichDisclosureItBelongsTo() {
        UUID disclosureId = UUID.randomUUID();
        assertEquals(disclosureId, SnapshotCopy.lineFrom(entry(), disclosureId).getDisclosureId());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=SnapshotCopyTest`
Expected: FAIL — `SnapshotCopy` does not exist.

- [ ] **Step 3: Write `SnapshotCopy`**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.climate.EmissionActivityEntry;
import com.wesee.esg.reference.EmissionFactor;

import java.util.UUID;

/**
 * Turns a live activity entry into a frozen disclosure line. Every field is copied by value, with
 * no reference back to {@code emission_factor} — a disclosure signed under the 2024 factor must
 * keep reporting what was signed after MGTC publishes a 2025 edition.
 */
public final class SnapshotCopy {

    private SnapshotCopy() {
    }

    public static SharedDisclosureLine lineFrom(EmissionActivityEntry entry, UUID disclosureId) {
        EmissionFactor factor = entry.getEmissionFactor();
        SharedDisclosureLine line = new SharedDisclosureLine();
        line.setDisclosureId(disclosureId);
        line.setScope(factor.getScope().name());
        line.setEmissionFactorId(factor.getId());
        line.setEmissionFactorName(factor.getName());
        line.setQuantity(entry.getQuantity());
        line.setActivityUnit(factor.getActivityUnit());
        line.setFactorValue(factor.getFactorValue());
        line.setFactorSource(factor.getSource());
        line.setFactorSourceYear(factor.getSourceYear());
        line.setTco2e(entry.getCalculatedTco2e());
        return line;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=SnapshotCopyTest`
Expected: PASS, 4 tests. Then wire `SharedDisclosureService.publish` to use `SnapshotCopy.lineFrom` instead of building lines inline.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/wesee/esg/supplychain/SnapshotCopy.java \
        backend/src/test/java/com/wesee/esg/supplychain/SnapshotCopyTest.java
git commit -m "feat(supplychain): freeze the factor into the published line

Copied by value, with no reference back to emission_factor. A test pins
it: editing the factor afterwards must not change what was published."
```

---

### Task 6: Allocation (buyer side)

**Files:**
- Create: `backend/src/main/resources/db/migration/V83__scope3_allocation.sql`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/Scope3Allocation.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/Scope3AllocationRepository.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/Allocation.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/Scope3AllocationService.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/dto/AllocateRequest.java`
- Create: `backend/src/main/java/com/wesee/esg/supplychain/dto/Scope3AllocationDto.java`
- Test: `backend/src/test/java/com/wesee/esg/supplychain/AllocationTest.java`

**Interfaces:**
- Consumes: `SharedDisclosureRepository`, `EmissionActivityService`
- Produces: `Allocation.share(BigDecimal purchased, BigDecimal basis)` → `BigDecimal` scale 6; `Allocation.allocate(BigDecimal scope1, BigDecimal scope2, BigDecimal share)` → `BigDecimal` scale 4; `Scope3AllocationService.allocate(UUID disclosureId, AllocateRequest)`, `.list()`, `.remove(UUID)`

This task carries Review Focus items 3 and 5.

- [ ] **Step 1: Write the failing test**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AllocationTest {

    @Test
    void aBuyerTakingAnEighthOfTheOutputTakesAnEighthOfTheFootprint() {
        BigDecimal share = Allocation.share(new BigDecimal("6000"), new BigDecimal("48000"));
        assertEquals(new BigDecimal("0.125000"), share);
        assertEquals(new BigDecimal("122.1683"),
                Allocation.allocate(new BigDecimal("443.5600"), new BigDecimal("533.7800"), share));
    }

    @Test
    void theWholeOutputTakesTheWholeFootprint() {
        BigDecimal share = Allocation.share(new BigDecimal("48000"), new BigDecimal("48000"));
        assertEquals(new BigDecimal("1.000000"), share);
        assertEquals(new BigDecimal("977.3400"),
                Allocation.allocate(new BigDecimal("443.5600"), new BigDecimal("533.7800"), share));
    }

    /**
     * Review Focus 3. Buying more than the supplier produced is impossible. Clamping the share to
     * 100% would silently hand the buyer the supplier's entire footprint and look reasonable.
     */
    @Test
    void buyingMoreThanTheSupplierProducedIsRefusedAndNamesBothNumbers() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> Allocation.share(new BigDecimal("60000"), new BigDecimal("48000")));
        assertTrue(e.getMessage().contains("60000"), e.getMessage());
        assertTrue(e.getMessage().contains("48000"), e.getMessage());
    }

    @Test
    void aZeroBasisIsRefusedRatherThanDividingByZero() {
        assertThrows(IllegalArgumentException.class,
                () -> Allocation.share(new BigDecimal("100"), BigDecimal.ZERO));
    }

    @Test
    void aNegativePurchaseIsRefused() {
        assertThrows(IllegalArgumentException.class,
                () -> Allocation.share(new BigDecimal("-1"), new BigDecimal("48000")));
    }

    @Test
    void buyingNothingAllocatesNothing() {
        BigDecimal share = Allocation.share(BigDecimal.ZERO, new BigDecimal("48000"));
        assertEquals(new BigDecimal("0.000000"), share);
        assertEquals(new BigDecimal("0.0000"),
                Allocation.allocate(new BigDecimal("443.56"), new BigDecimal("533.78"), share));
    }

    @Test
    void theShareCarriesSixDecimalsSoASmallBuyerIsNotRoundedToZero() {
        // One unit in a million: 0.000001, which must survive rather than round away.
        assertEquals(new BigDecimal("0.000001"),
                Allocation.share(BigDecimal.ONE, new BigDecimal("1000000")));
    }

    @Test
    void bothScopesAreSummedBeforeTheShareIsApplied() {
        BigDecimal share = Allocation.share(new BigDecimal("24000"), new BigDecimal("48000"));
        assertEquals(new BigDecimal("488.6700"),
                Allocation.allocate(new BigDecimal("443.5600"), new BigDecimal("533.7800"), share));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn -q test -Dtest=AllocationTest`
Expected: FAIL — `Allocation` does not exist.

- [ ] **Step 3: Write `Allocation`**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The GHG Protocol's physical-allocation method: the buyer's share of a supplier's footprint is
 * the share of the supplier's output it bought. Six decimals on the share, so a buyer taking one
 * unit in a million is not rounded to nothing.
 */
public final class Allocation {

    public static final int SHARE_SCALE = 6;
    public static final int TCO2E_SCALE = 4;

    private Allocation() {
    }

    public static BigDecimal share(BigDecimal purchasedQuantity, BigDecimal basisQuantity) {
        if (purchasedQuantity == null || basisQuantity == null) {
            throw new IllegalArgumentException("Both the purchased quantity and the basis are required");
        }
        if (purchasedQuantity.signum() < 0) {
            throw new IllegalArgumentException("A purchased quantity cannot be negative");
        }
        if (basisQuantity.signum() <= 0) {
            throw new IllegalArgumentException("The supplier's basis quantity must be greater than zero");
        }
        if (purchasedQuantity.compareTo(basisQuantity) > 0) {
            throw new IllegalArgumentException(
                    "You recorded buying " + purchasedQuantity.toPlainString() + " against a supplier"
                            + " that declared " + basisQuantity.toPlainString()
                            + " — one of those two figures is wrong, and allocating anyway would hand"
                            + " you more than the supplier's whole footprint");
        }
        return purchasedQuantity.divide(basisQuantity, SHARE_SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal allocate(BigDecimal scope1Tco2e, BigDecimal scope2Tco2e, BigDecimal share) {
        return scope1Tco2e.add(scope2Tco2e).multiply(share).setScale(TCO2E_SCALE, RoundingMode.HALF_UP);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn -q test -Dtest=AllocationTest`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the migration**

`backend/src/main/resources/db/migration/V83__scope3_allocation.sql`:

```sql
-- The buyer's own record of what it drew from a supplier's snapshot. Tenant-owned by the BUYER,
-- so unlike the two shared tables this one sits under the ordinary Hibernate filter.
--
-- share_fraction is stored rather than recomputed: the audit trail must show the division that
-- was actually performed, even after the supplier republishes with a different basis.

CREATE TABLE scope3_allocation (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    shared_disclosure_id UUID NOT NULL REFERENCES shared_disclosure (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    purchased_quantity NUMERIC(18, 4) NOT NULL,
    purchased_unit VARCHAR(30) NOT NULL,
    share_fraction NUMERIC(12, 6) NOT NULL,
    allocated_tco2e NUMERIC(18, 4) NOT NULL,
    -- 1 for now. The column exists so categories 2 and 4 can follow without a migration.
    ghg_category INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (company_id, shared_disclosure_id),
    CONSTRAINT scope3_allocation_share_within_one CHECK (share_fraction > 0 OR purchased_quantity = 0),
    CONSTRAINT scope3_allocation_share_not_above_one CHECK (share_fraction <= 1)
);

CREATE INDEX idx_scope3_allocation_company_year ON scope3_allocation (company_id, fiscal_year);
```

- [ ] **Step 6: Write the entity, repository, service and controller**

`Scope3Allocation` extends `TenantOwnedEntity` — `UUID sharedDisclosureId`, `Integer fiscalYear`, `BigDecimal purchasedQuantity`, `String purchasedUnit`, `BigDecimal shareFraction`, `BigDecimal allocatedTco2e`, `Integer ghgCategory`.

`Scope3AllocationRepository` — `findByCompanyIdAndFiscalYearOrderByCreatedAtAsc(UUID, Integer)`, `findByCompanyIdAndSharedDisclosureId(UUID, UUID)`, `findByIdAndCompanyId(UUID, UUID)`.

`Scope3AllocationService.allocate(UUID disclosureId, AllocateRequest request)`:

1. `requireCompanyId()`, then `sharedDisclosureRepository.findByIdForBuyer(disclosureId, companyId)` — a disclosure the caller is not the buyer of is `NotFoundException`.
2. Refuse if `revokedAt` is set: a withdrawn snapshot cannot be newly cited.
3. `Allocation.share` then `Allocation.allocate`.
4. Upsert on `(companyId, sharedDisclosureId)` so re-entering a quantity corrects rather than duplicates.
5. Feed the result into the buyer's Scope 3 through `EmissionActivityService`, the same path an accepted extraction takes, so sign-off, the assurance hash and the CSI export pick it up with no changes. **Read `EmissionActivityService` first** and use its existing entry-creation method rather than writing to `EmissionActivityEntryRepository` directly.

**Review Focus 5** — `Scope3AllocationDto` carries a `boolean newerSnapshotAvailable`, computed by checking whether a non-revoked disclosure exists on the same link with a later `publishedAt` than the one this allocation points at. The allocation keeps pointing at the snapshot it used; the UI says a newer one exists. Nothing re-allocates automatically.

Controller endpoints under `/api/v1/supply-chain`:

- `GET /disclosures/available` → the buyer's readable snapshots
- `GET /allocations` → `list`
- `POST /disclosures/{disclosureId}/allocate` → `allocate`
- `DELETE /allocations/{allocationId}` → `remove`

- [ ] **Step 7: Compile and commit**

Run: `cd backend && mvn -q compile && mvn -q test`

```bash
git add backend/src/main/resources/db/migration/V83__scope3_allocation.sql \
        backend/src/main/java/com/wesee/esg/supplychain/ \
        backend/src/test/java/com/wesee/esg/supplychain/
git commit -m "feat(supplychain): allocate a supplier footprint into Scope 3

The supplier declares a total and a basis; the buyer divides. Neither
side discloses what it would rather not — the supplier never names its
customers, the buyer never waits on the supplier to compute.

Buying more than the supplier produced is refused by name. Clamping to
100% would hand the buyer the whole footprint and look reasonable."
```

---

### Task 7: The test that decides whether this ships

**Files:**
- Test: `backend/src/test/java/com/wesee/esg/supplychain/SupplyChainIsolationTest.java`
- Modify: `backend/pom.xml` only if a test-scoped dependency is missing

**Interfaces:**
- Consumes: `SharedDisclosureRepository`, `SupplyLinkRepository`

This is the one test the spec singles out:

> **A buyer cannot read a `shared_disclosure` on a link it is not the buyer of.**

Unlike every other test in this plan, it needs a real repository and a real database, because the thing under test is a JPQL predicate. It is the only `@SpringBootTest`-style test this plan adds, and it earns that cost.

- [ ] **Step 1: Check what integration-test support exists**

Run: `grep -rn "testcontainers\|@DataJpaTest\|@SpringBootTest" backend/pom.xml backend/src/test`

The existing suite is 17 unit tests with no Spring context. If Testcontainers is absent, add `org.testcontainers:postgresql` and `org.testcontainers:junit-jupiter` at test scope, pinned to the version the Spring Boot 3.3.5 BOM manages. `@DataJpaTest` against H2 is **not** acceptable here: the partial unique index and the JPQL enum-qualified predicate must run on Postgres, which is where they will run in production.

- [ ] **Step 2: Write the test**

```java
/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

// Imports per whatever Testcontainers + @DataJpaTest setup Step 1 established.

/**
 * The test the design document singles out. This feature is the first thing in the schema to
 * cross a tenant boundary, and the two shared tables sit outside the Hibernate filter on purpose,
 * so the repository's own predicate IS the isolation. If it leaks, nothing else catches it.
 *
 * <p>Asserts an EMPTY RESULT rather than an exception. A leak that returns rows is the failure
 * mode that matters: an exception is loud and gets fixed, a silently returned row is a competitor
 * reading your emissions.
 */
class SupplyChainIsolationTest {

    // Arrange: three companies — buyerA, buyerB, supplier.
    //   linkA: buyerA  -> supplier, ACTIVE, with one published shared_disclosure (disclosureA)
    //   linkB: buyerB  -> supplier, ACTIVE, with one published shared_disclosure (disclosureB)

    // 1. buyerA sees exactly one disclosure, and it is disclosureA.
    //    assertEquals(1, repo.findPublishedForBuyer(buyerA).size());

    // 2. THE TEST. buyerA asks for disclosureB by its id and gets nothing back.
    //    assertTrue(repo.findByIdForBuyer(disclosureB.getId(), buyerA).isEmpty());

    // 3. The supplier sees both of its own published snapshots.
    //    assertEquals(2, repo.findForSupplier(supplier).size());

    // 4. A buyer on a REVOKED link stops seeing what it used to see.
    //    linkA.setStatus(REVOKED); flush;
    //    assertTrue(repo.findPublishedForBuyer(buyerA).isEmpty());

    // 5. A revoked DISCLOSURE drops out of the buyer's list but the link stays live.
    //    disclosureA.setRevokedAt(Instant.now()); flush;
    //    assertTrue(repo.findPublishedForBuyer(buyerA).isEmpty());

    // 6. A company with no links at all sees nothing, rather than everything.
    //    assertTrue(repo.findPublishedForBuyer(UUID.randomUUID()).isEmpty());
}
```

Fill in each numbered comment as a real `@Test` method with the arrange/act/assert written out. The comments are the specification of what each one must prove.

- [ ] **Step 3: Run it**

Run: `cd backend && mvn -q test -Dtest=SupplyChainIsolationTest`
Expected: PASS, 6 tests.

**If any assertion fails, stop.** A failure here means the feature leaks across tenants and nothing downstream matters until the predicate is fixed.

- [ ] **Step 4: Confirm nothing disables the filter**

Run: `grep -rn "disableFilter" backend/src/main/java`
Expected: no results. If this returns anything added by this plan, remove it — the two shared tables are outside the filter by design, and disabling it anywhere would take every other table out with them.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/java/com/wesee/esg/supplychain/SupplyChainIsolationTest.java backend/pom.xml
git commit -m "test(supplychain): a buyer cannot read another buyer's disclosure

The first feature in this schema to cross a tenant boundary, so the
repository predicate IS the isolation. Asserts an empty result rather
than an exception: a leak that returns rows is the failure mode that
matters."
```

---

### Task 8: The supply chain screen

**Files:**
- Create: `frontend/src/api/supplyChainApi.ts`
- Create: `frontend/src/components/SupplyChainView.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: the navigation component (`grep -rn "IndicatorsView" frontend/src --include=*.tsx`)
- Modify: `frontend/src/permissions.ts` (add the two new keys)

- [ ] **Step 1: Read the patterns**

Read an existing api client and a view with a table and a modal — `frontend/src/components/AssuranceWorkspaceView.tsx` is the nearest in shape. Match its fetch wrapper, error handling and styling. Use the existing `saveBlob` helper from `frontend/src/utils/download.ts` for any download, and `useDismissable` from `frontend/src/hooks/useDismissable.ts` for any modal.

- [ ] **Step 2: Write the api client and view**

Three panels on one screen:

- **My suppliers** (acting as buyer) — the links, an Invite button, and for each active link with a published snapshot: the figures, the sign-off hash and signer, a field for the purchased quantity, and the resulting allocation. A `newerSnapshotAvailable` flag shows a notice with a button to re-allocate; it never re-allocates by itself.
- **My buyers** (acting as supplier) — the links pointing at this company, and per fiscal year a Publish button, disabled with the reason when the year is not signed off.
- **Allocations** — what has been drawn into Scope 3 this year, with the arithmetic (purchased ÷ basis × (scope 1 + scope 2)) shown per row.

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat(supplychain): the screen for both sides of the link

One screen, two roles: a company is a buyer to its suppliers and a
supplier to its buyers, often on the same day."
```

---

### Task 9: Prove the loop end to end

**Files:** none changed unless this finds a problem.

- [ ] **Step 1: Start the stack**

Run: `make infra`, then `cd backend && mvn -q spring-boot:run` in the background.

Expected: V81, V82, V83 apply; `ddl-auto: validate` passes. If startup fails on duplicate classes, run `make tidy`.

- [ ] **Step 2: Walk the whole loop with two accounts**

1. Register company A (buyer) and company B (supplier), each through ordinary registration.
2. As A, invite B's email. Confirm the invite email arrives (or read the token from the log in dev).
3. As B, accept. Confirm the link shows ACTIVE on both screens.
4. As B, enter an electricity bill, accept the extraction, and sign off the fiscal year.
5. As B, publish that year to A with a basis of 48,000 units.
6. As A, see the snapshot: the figures, the hash, the signer, and the calculation lines.
7. As A, enter a purchased quantity of 6,000 units. Confirm the allocation is 12.5% of B's Scope 1+2.
8. As A, open the emissions screen and confirm the allocated figure appears in Scope 3.

- [ ] **Step 3: Try to break it**

- As A, enter a purchased quantity of 60,000 against a 48,000 basis. Expect the refusal naming both numbers, not a clamp.
- As B, revoke the disclosure. Confirm A still sees its allocation but is told the source was withdrawn.
- As B, re-sign the year and publish again. Confirm A sees "a newer snapshot exists" and that its existing allocation still points at the old one.

- [ ] **Step 4: Run the whole suite**

Run: `cd backend && mvn -q test`
Expected: all tests pass, `SupplyChainIsolationTest` included.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(supplychain): <whatever the live walkthrough caught>"
```
