/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.targets.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PerformanceTargetResponse(
        UUID id,
        String title,
        String description,
        int baselineYear,
        int targetYear,
        BigDecimal targetValue,
        int currentProgress,
        String indicatorId,
        /** True when currentProgress was computed live from real indicator data rather than manually entered. */
        boolean progressComputed,
        String horizon
) {
}
