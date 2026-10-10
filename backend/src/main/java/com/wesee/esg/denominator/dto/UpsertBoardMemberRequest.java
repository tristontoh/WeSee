/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpsertBoardMemberRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 150) String roleTitle,
        boolean independent,
        @Size(max = 20) String gender,
        LocalDate appointedAt,
        LocalDate resignedAt
) {
}
