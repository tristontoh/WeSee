/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.user.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserProfileRequest(
        @NotBlank String name,
        String phone,
        String jobTitle,
        String department,
        String bio
) {
}
