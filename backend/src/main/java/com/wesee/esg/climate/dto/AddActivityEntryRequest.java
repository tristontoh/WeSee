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
