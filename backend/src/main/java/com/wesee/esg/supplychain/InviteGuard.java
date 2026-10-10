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

    private static final String SELF_LINK_REFUSAL =
            "That address belongs to your own company. A supply link records what you bought from"
                    + " someone else; linking to yourself would count the same emissions on both"
                    + " sides of your own ledger.";

    private InviteGuard() {
    }

    /**
     * @param emailOwnerCompanyId the company of the existing user behind the invited address, or
     *                            null when nobody holds it yet
     */
    public static void requireInvitable(UUID buyerCompanyId, UUID emailOwnerCompanyId) {
        if (emailOwnerCompanyId != null && emailOwnerCompanyId.equals(buyerCompanyId)) {
            throw new IllegalArgumentException(SELF_LINK_REFUSAL);
        }
    }

    /**
     * Checked again at accept time, not only at invite time: the address may have been unclaimed
     * when the invite went out and since joined the buyer's own company.
     */
    public static void requireAcceptingCompanyIsNotTheBuyer(SupplyLink link, UUID acceptingCompanyId) {
        if (acceptingCompanyId.equals(link.getBuyerCompanyId())) {
            throw new IllegalArgumentException(SELF_LINK_REFUSAL);
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
