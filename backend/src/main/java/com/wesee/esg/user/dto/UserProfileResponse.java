/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.user.dto;

import com.wesee.esg.user.Role;

import java.time.Instant;
import java.util.UUID;

public record UserProfileResponse(
        UUID userId,
        String name,
        String email,
        Role role,
        String companyName,
        String phone,
        String jobTitle,
        String department,
        String bio,
        String avatarColor,
        Instant memberSince
) {
}
