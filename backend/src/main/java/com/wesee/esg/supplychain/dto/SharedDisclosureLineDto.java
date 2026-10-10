/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.supplychain.dto;

import com.wesee.esg.supplychain.SharedDisclosureLine;

import java.math.BigDecimal;

public record SharedDisclosureLineDto(
        String scope,
        String emissionFactorId,
        String emissionFactorName,
        BigDecimal quantity,
        String activityUnit,
        BigDecimal factorValue,
        String factorSource,
        Integer factorSourceYear,
        BigDecimal tco2e
) {
    public static SharedDisclosureLineDto from(SharedDisclosureLine l) {
        return new SharedDisclosureLineDto(l.getScope(), l.getEmissionFactorId(),
                l.getEmissionFactorName(), l.getQuantity(), l.getActivityUnit(),
                l.getFactorValue(), l.getFactorSource(), l.getFactorSourceYear(), l.getTco2e());
    }
}
