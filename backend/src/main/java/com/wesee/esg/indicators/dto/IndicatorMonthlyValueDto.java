/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record IndicatorMonthlyValueDto(
        int fiscalYear,
        int month,
        BigDecimal value,
        String enteredBy,
        Instant enteredAt,
        String sourceDocName,
        String sourceDocPath
) {
}
