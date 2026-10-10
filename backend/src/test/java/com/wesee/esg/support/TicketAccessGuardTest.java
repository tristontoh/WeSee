/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.support;

import com.wesee.esg.user.Role;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TicketAccessGuardTest {

    private static final UUID COMPANY_A = UUID.randomUUID();
    private static final UUID COMPANY_B = UUID.randomUUID();

    @Test
    void aCompanySeesItsOwnTicket() {
        assertTrue(TicketAccessGuard.canReach(COMPANY_A, COMPANY_A, Role.COMPANY_ADMIN));
        assertTrue(TicketAccessGuard.canReach(COMPANY_A, COMPANY_A, Role.COMPANY_CONTRIBUTOR));
    }

    /** The defect this guard exists for: the ticket id is a path variable anyone can change. */
    @Test
    void aCompanyCannotReachAnotherCompanysTicket() {
        assertFalse(TicketAccessGuard.canReach(COMPANY_B, COMPANY_A, Role.COMPANY_ADMIN));
        assertFalse(TicketAccessGuard.canReach(COMPANY_B, COMPANY_A, Role.COMPANY_CONTRIBUTOR));
        assertFalse(TicketAccessGuard.canReach(COMPANY_B, COMPANY_A, Role.CONSULTANT));
    }

    /** Support would not work otherwise — the admin console answers every company's tickets. */
    @Test
    void platformStaffReachEveryTicket() {
        assertTrue(TicketAccessGuard.canReach(COMPANY_B, COMPANY_A, Role.PLATFORM_ADMIN));
        assertTrue(TicketAccessGuard.canReach(COMPANY_B, COMPANY_A, Role.SUPERADMIN));
        assertTrue(TicketAccessGuard.canReach(COMPANY_B, null, Role.PLATFORM_ADMIN));
    }

    /** A principal with no company is not a wildcard unless it is platform staff. */
    @Test
    void aCompanylessTenantUserReachesNothing() {
        assertFalse(TicketAccessGuard.canReach(COMPANY_A, null, Role.COMPANY_ADMIN));
        assertFalse(TicketAccessGuard.canReach(COMPANY_A, null, Role.CONSULTANT));
    }

    /** A ticket with no company is not a wildcard either. */
    @Test
    void aTicketWithNoCompanyReachesNoTenant() {
        assertFalse(TicketAccessGuard.canReach(null, COMPANY_A, Role.COMPANY_ADMIN));
        assertFalse(TicketAccessGuard.canReach(null, null, Role.COMPANY_ADMIN));
        assertTrue(TicketAccessGuard.canReach(null, COMPANY_A, Role.PLATFORM_ADMIN));
    }

    @Test
    void anAbsentRoleReachesNothing() {
        assertFalse(TicketAccessGuard.canReach(COMPANY_A, COMPANY_A, null));
    }
}
