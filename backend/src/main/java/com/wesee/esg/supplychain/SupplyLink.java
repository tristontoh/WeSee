/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A link between a buyer and one of its suppliers. Not a
 * {@link com.wesee.esg.common.TenantOwnedEntity}: it belongs to two companies at once, and the
 * single-tenant Hibernate filter has no sensible answer for that. Isolation is enforced instead by
 * {@link SupplyLinkRepository} binding the acting company id in every query — there is no finder
 * that reads by id alone.
 */
@Entity
@Table(name = "supply_link")
@Getter
@Setter
@NoArgsConstructor
public class SupplyLink extends BaseEntity {

    @Column(name = "buyer_company_id", nullable = false, updatable = false)
    private UUID buyerCompanyId;

    /** Null until the supplier accepts: before that, only an email address is known. */
    @Column(name = "supplier_company_id")
    private UUID supplierCompanyId;

    @Column(name = "supplier_email", nullable = false, length = 255)
    private String supplierEmail;

    @Column(name = "supplier_name", length = 200)
    private String supplierName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SupplyLinkStatus status = SupplyLinkStatus.PENDING;

    /** Only the SHA-256 of the token is stored; the raw token exists only in the invite email. */
    @Column(name = "invite_token_hash", nullable = false, unique = true, length = 64)
    private String inviteTokenHash;

    @Column(name = "invited_by_user_id")
    private UUID invitedByUserId;

    @Column(name = "invited_by_name", length = 200)
    private String invitedByName;

    @Column(name = "invited_at", nullable = false)
    private Instant invitedAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    /**
     * Who actually accepted, which need not be the mailbox the invitation was sent to — a
     * supplier's sustainability lead often receives it forwarded. The token is the authorisation;
     * this is the record of who used it.
     */
    @Column(name = "accepted_by_user_id")
    private UUID acceptedByUserId;

    @Column(name = "accepted_by_email", length = 255)
    private String acceptedByEmail;
}
