/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain.dto;

import com.wesee.esg.supplychain.Scope3Allocation;

import java.math.BigDecimal;
import java.util.UUID;

public record Scope3AllocationDto(
        UUID id,
        UUID sharedDisclosureId,
        String supplierName,
        Integer fiscalYear,
        BigDecimal purchasedQuantity,
        String purchasedUnit,
        BigDecimal basisQuantity,
        BigDecimal shareFraction,
        BigDecimal supplierTotalTco2e,
        BigDecimal allocatedTco2e,
        Integer ghgCategory,
        /** The supplier has published a newer snapshot; this allocation still cites the old one. */
        boolean newerSnapshotAvailable,
        /** The supplier withdrew the snapshot this allocation was drawn from. */
        boolean sourceWithdrawn
) {
    public static Scope3AllocationDto from(Scope3Allocation a, String supplierName,
                                           BigDecimal basisQuantity, BigDecimal supplierTotalTco2e,
                                           boolean newerSnapshotAvailable, boolean sourceWithdrawn) {
        return new Scope3AllocationDto(a.getId(), a.getSharedDisclosureId(), supplierName,
                a.getFiscalYear(), a.getPurchasedQuantity(), a.getPurchasedUnit(),
                basisQuantity, a.getShareFraction(), supplierTotalTco2e, a.getAllocatedTco2e(),
                a.getGhgCategory(), newerSnapshotAvailable, sourceWithdrawn);
    }
}
