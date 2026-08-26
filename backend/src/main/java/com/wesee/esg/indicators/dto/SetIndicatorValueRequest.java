package com.wesee.esg.indicators.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SetIndicatorValueRequest(
        @NotNull @DecimalMin(value = "0", message = "must be non-negative") BigDecimal value,
        String sourceDocName,
        /**
         * Where the evidence is stored, when there is any. Optional for a hand-typed figure; the
         * extraction review path fills it so an accepted reading keeps the trail back to its bill.
         */
        String sourceDocPath,
        String comment
) {
}
