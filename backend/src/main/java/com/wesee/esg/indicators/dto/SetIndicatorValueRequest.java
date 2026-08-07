package com.wesee.esg.indicators.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SetIndicatorValueRequest(
        @NotNull @DecimalMin(value = "0", message = "must be non-negative") BigDecimal value,
        String sourceDocName,
        String comment
) {
}
