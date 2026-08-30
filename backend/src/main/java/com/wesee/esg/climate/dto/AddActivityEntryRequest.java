/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record AddActivityEntryRequest(
        @NotNull Integer fiscalYear,
        @NotBlank String factorId,
        @NotNull @DecimalMin(value = "0", inclusive = false, message = "must be positive") BigDecimal quantity
) {
}
