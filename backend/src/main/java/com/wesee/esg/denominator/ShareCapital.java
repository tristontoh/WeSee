/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "share_capital")
@Getter
@Setter
@NoArgsConstructor
public class ShareCapital extends TenantOwnedEntity {

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(name = "total_outstanding_shares", nullable = false, precision = 18, scale = 4)
    private BigDecimal totalOutstandingShares;

    @Column(name = "public_held_shares", precision = 18, scale = 4)
    private BigDecimal publicHeldShares;

    @Column(name = "bumiputera_held_shares", precision = 18, scale = 4)
    private BigDecimal bumiputeraHeldShares;
}
