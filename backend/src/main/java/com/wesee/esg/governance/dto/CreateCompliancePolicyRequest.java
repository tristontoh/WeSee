package com.wesee.esg.governance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateCompliancePolicyRequest(
        @NotBlank String name,
        String description,
        @NotNull @Min(1) @Max(120) Integer reviewCycleMonths
) {
}
