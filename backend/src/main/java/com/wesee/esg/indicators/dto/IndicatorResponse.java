/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.dto;

import com.wesee.esg.reference.AggregationRule;
import com.wesee.esg.reference.SustainabilityMatterCategory;
import com.wesee.esg.reference.TargetDirection;

import java.math.BigDecimal;
import java.util.List;

public record IndicatorResponse(
        String id,
        String name,
        String unit,
        String matterId,
        SustainabilityMatterCategory category,
        boolean sectorSpecific,
        String sectorCode,
        BigDecimal effectiveTarget,
        TargetDirection effectiveTargetDirection,
        boolean enabled,
        AggregationRule aggregationRule,
        /** Names the formula in DerivationRegistry. Null unless the rule is DERIVED. */
        String derivationKey,
        /** Human-readable, e.g. "(Scope 1 + Scope 2) (tCO2e) / revenue (RM mil)". Null unless DERIVED. */
        String formula,
        List<IndicatorValuePointDto> values,
        List<IndicatorMonthlyValueDto> monthlyValues,
        List<AuditEntryDto> history
) {
}
