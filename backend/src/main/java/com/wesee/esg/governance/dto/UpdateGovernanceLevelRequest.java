/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.governance.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateGovernanceLevelRequest(
        @NotBlank String roleTitle,
        String description
) {
}
