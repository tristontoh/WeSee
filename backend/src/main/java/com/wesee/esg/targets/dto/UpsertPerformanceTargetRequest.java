package com.wesee.esg.targets.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpsertPerformanceTargetRequest(
        @NotBlank String title,
        String description,
        @NotNull Integer baselineYear,
        @NotNull Integer targetYear,
        @NotNull BigDecimal targetValue,
        @Min(0) @Max(100) Integer currentProgress,
        String indicatorId,
        String horizon
) {
}
