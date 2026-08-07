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
        List<IndicatorValuePointDto> values,
        List<IndicatorMonthlyValueDto> monthlyValues,
        List<AuditEntryDto> history
) {
}
