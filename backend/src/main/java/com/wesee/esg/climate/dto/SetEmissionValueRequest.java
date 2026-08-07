package com.wesee.esg.climate.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SetEmissionValueRequest(
        @NotNull @DecimalMin(value = "0", message = "must be non-negative") BigDecimal value
) {
}
