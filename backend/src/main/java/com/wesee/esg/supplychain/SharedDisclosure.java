/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A snapshot of one supplier's signed-off fiscal year, published to one buyer. Not tenant-owned:
 * it is reached only through a {@link SupplyLink}, and {@link SharedDisclosureRepository} binds
 * the acting company in every query.
 */
@Entity
@Table(name = "shared_disclosure")
@Getter
@Setter
@NoArgsConstructor
public class SharedDisclosure extends BaseEntity {

    @Column(name = "supply_link_id", nullable = false, updatable = false)
    private UUID supplyLinkId;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(name = "scope1_tco2e", nullable = false, precision = 18, scale = 4)
    private BigDecimal scope1Tco2e;

    @Column(name = "scope2_tco2e", nullable = false, precision = 18, scale = 4)
    private BigDecimal scope2Tco2e;

    /** What the buyer divides its own purchase by. */
    @Column(name = "basis_quantity", nullable = false, precision = 18, scale = 4)
    private BigDecimal basisQuantity;

    @Column(name = "basis_unit", nullable = false, length = 30)
    private String basisUnit;

    @Column(name = "sign_off_hash", nullable = false, length = 64)
    private String signOffHash;

    @Column(name = "signer_name", nullable = false, length = 200)
    private String signerName;

    @Column(name = "signed_at", nullable = false)
    private Instant signedAt;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt = Instant.now();

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revocation_reason", columnDefinition = "TEXT")
    private String revocationReason;
}
