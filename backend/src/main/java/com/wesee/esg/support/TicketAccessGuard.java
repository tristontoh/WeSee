/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.support;

import com.wesee.esg.user.Role;

import java.util.UUID;

/**
 * Who may reach a support ticket.
 *
 * <p>A ticket id arrives as a path variable, and three tenant-facing endpoints used to resolve it
 * with {@code findById} and nothing else. That looked safe because {@code SupportTicket} is
 * tenant-owned and carries the Hibernate {@code companyFilter} — but a filter is applied when
 * Hibernate builds a query, and a load by primary key never builds one. {@code TenantFilterCoverageTest}
 * pins that behaviour down. So the filter never saw those calls, and any signed-in user who
 * guessed or was shown a ticket id could read another company's support thread, post into it, and
 * overwrite its note.
 *
 * <p>A pure predicate rather than a check inlined in each service, for the same reason
 * {@link com.wesee.esg.extraction.SignOffGuard} is one: the rule is worth stating once and
 * testing directly, and the three call sites then cannot disagree about it.
 */
public final class TicketAccessGuard {

    private TicketAccessGuard() {
    }

    /**
     * @param ticketCompanyId the company the ticket belongs to
     * @param callerCompanyId the caller's company, null for a principal without one
     * @param callerRole      the caller's role, null if somehow absent
     * @return true if this caller may read or write this ticket
     */
    public static boolean canReach(UUID ticketCompanyId, UUID callerCompanyId, Role callerRole) {
        if (callerRole == null) {
            return false;
        }
        // Platform staff answer tickets from every company — that is the job of the admin console.
        if (callerRole == Role.PLATFORM_ADMIN || callerRole == Role.SUPERADMIN) {
            return true;
        }
        // Null is never a wildcard on either side: two unknowns must not match each other.
        return ticketCompanyId != null && ticketCompanyId.equals(callerCompanyId);
    }
}
