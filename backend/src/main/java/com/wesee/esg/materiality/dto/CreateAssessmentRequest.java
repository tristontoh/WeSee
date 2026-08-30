/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.materiality.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record CreateAssessmentRequest(
        @NotBlank String name,
        @NotNull LocalDate assessmentDate,
        @Valid List<ScoreInput> scores,
        List<String> stakeholderNames
) {
}
