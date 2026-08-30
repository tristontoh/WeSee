/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.reference.dto;

import com.wesee.esg.reference.AggregationRule;
import com.wesee.esg.reference.SustainabilityMatterCategory;
import com.wesee.esg.reference.TargetDirection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record IndicatorDefinitionUpsertRequest(
        @NotBlank String id,
        @NotBlank String name,
        @NotBlank String unit,
        @NotBlank String matterId,
        @NotNull SustainabilityMatterCategory category,
        boolean sectorSpecific,
        String sectorCode,
        BigDecimal defaultTarget,
        TargetDirection defaultTargetDirection,
        @NotNull AggregationRule aggregationRule
) {
}
