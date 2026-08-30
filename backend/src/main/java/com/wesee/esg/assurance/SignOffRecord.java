/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.assurance;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * One mutable row per (company, fiscal year) — can transition SIGNED -&gt; REVOKED -&gt; SIGNED
 * again, rather than a plain boolean (SRS FR-7.1).
 */
@Entity
@Table(name = "sign_off_record", uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "fiscal_year"}))
@Getter
@Setter
@NoArgsConstructor
public class SignOffRecord extends TenantOwnedEntity {

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SignOffStatus status;

    @Column(name = "signer_name", length = 200)
    private String signerName;

    @Column(name = "signer_title", length = 200)
    private String signerTitle;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 64)
    private String hash;

    @Column(name = "signed_at")
    private Instant signedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by", length = 200)
    private String revokedBy;

    @Column(name = "revocation_reason", columnDefinition = "TEXT")
    private String revocationReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "assurance_level", nullable = false, length = 20)
    private AssuranceLevel assuranceLevel = AssuranceLevel.INTERNAL_REVIEW;

    @Column(name = "external_assurer_name", length = 200)
    private String externalAssurerName;

    @Column(name = "standard_referenced", length = 100)
    private String standardReferenced;
}
