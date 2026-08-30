/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.dto;

import com.wesee.esg.reference.TargetDirection;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SetIndicatorTargetRequest(
        @NotNull BigDecimal target,
        @NotNull TargetDirection targetDirection
) {
}
