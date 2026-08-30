/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.apiaccess.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateApiTokenRequest(
        @NotBlank String name,
        @NotEmpty List<String> scopes,
        Integer expiresInDays
) {
}
