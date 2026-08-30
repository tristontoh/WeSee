/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record ScoreInput(
        @NotBlank String matterId,
        @Min(1) @Max(5) int impact,
        @Min(1) @Max(5) int influence,
        String rationale
) {
}
