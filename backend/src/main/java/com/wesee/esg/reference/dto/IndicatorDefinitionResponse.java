/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference.dto;

import com.wesee.esg.reference.AggregationRule;
import com.wesee.esg.reference.IndicatorDefinition;
import com.wesee.esg.reference.SustainabilityMatterCategory;
import com.wesee.esg.reference.TargetDirection;

import java.math.BigDecimal;

public record IndicatorDefinitionResponse(
        String id,
        String name,
        String unit,
        String matterId,
        SustainabilityMatterCategory category,
        boolean sectorSpecific,
        String sectorCode,
        BigDecimal defaultTarget,
        TargetDirection defaultTargetDirection,
        AggregationRule aggregationRule
) {
    public static IndicatorDefinitionResponse from(IndicatorDefinition d) {
        return new IndicatorDefinitionResponse(
                d.getId(),
                d.getName(),
                d.getUnit(),
                d.getMatter().getId(),
                d.getCategory(),
                Boolean.TRUE.equals(d.getSectorSpecific()),
                d.getSector() != null ? d.getSector().getCode() : null,
                d.getDefaultTarget(),
                d.getDefaultTargetDirection(),
                d.getAggregationRule()
        );
    }
}
