package com.wesee.esg.indicators.dto;

import com.wesee.esg.indicators.IndicatorValueStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record IndicatorValuePointDto(
        int fiscalYear,
        BigDecimal value,
        IndicatorValueStatus status,
        String approvedByName,
        Instant approvedAt,
        boolean isComputed,
        int monthsReported
) {
}
