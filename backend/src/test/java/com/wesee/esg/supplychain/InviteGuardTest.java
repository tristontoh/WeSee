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

    /** A supplier accepting into the buyer's own company would be the same double-count. */
    @Test
    void acceptingIntoTheBuyersOwnCompanyIsRefused() {
        SupplyLink l = link(SupplyLinkStatus.PENDING, NOW.plus(7, ChronoUnit.DAYS));
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> InviteGuard.requireAcceptingCompanyIsNotTheBuyer(l, l.getBuyerCompanyId()));
        assertTrue(e.getMessage().toLowerCase().contains("own company"), e.getMessage());
    }

    @Test
    void acceptingFromAnyOtherCompanyIsFine() {
        SupplyLink l = link(SupplyLinkStatus.PENDING, NOW.plus(7, ChronoUnit.DAYS));
        assertDoesNotThrow(() ->
                InviteGuard.requireAcceptingCompanyIsNotTheBuyer(l, UUID.randomUUID()));
    }
}
