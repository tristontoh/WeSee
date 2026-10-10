/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * The buyer's record of what it drew from one supplier snapshot. Tenant-owned by the buyer, so
 * unlike {@link SupplyLink} and {@link SharedDisclosure} this one sits under the ordinary
 * Hibernate tenant filter like everything else in the schema.
 */
@Entity
@Table(name = "scope3_allocation")
@Getter
@Setter
@NoArgsConstructor
public class Scope3Allocation extends TenantOwnedEntity {

    /**
     * The snapshot this allocation was drawn from. Updatable: when the supplier republishes and
     * the buyer re-enters its quantity, the same allocation moves to the newer snapshot rather
     * than a second one being created beside it.
     */
    @Column(name = "shared_disclosure_id", nullable = false)
    private UUID sharedDisclosureId;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(name = "purchased_quantity", nullable = false, precision = 18, scale = 4)
    private BigDecimal purchasedQuantity;

    @Column(name = "purchased_unit", nullable = false, length = 30)
    private String purchasedUnit;

    /** Stored, not recomputed: the audit trail shows the division that was actually performed. */
    @Column(name = "share_fraction", nullable = false, precision = 12, scale = 6)
    private BigDecimal shareFraction;

    @Column(name = "allocated_tco2e", nullable = false, precision = 18, scale = 4)
    private BigDecimal allocatedTco2e;

    @Column(name = "ghg_category", nullable = false)
    private Integer ghgCategory = 1;
}
