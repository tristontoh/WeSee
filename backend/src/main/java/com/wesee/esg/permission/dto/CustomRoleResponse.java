/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.permission.dto;

import com.wesee.esg.permission.CustomRole;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CustomRoleResponse(
        UUID id,
        String name,
        String description,
        List<String> permissionKeys,
        Instant createdAt,
        Instant updatedAt
) {
    public static CustomRoleResponse from(CustomRole role) {
        return new CustomRoleResponse(role.getId(), role.getName(), role.getDescription(),
                role.getPermissionKeys(), role.getCreatedAt(), role.getUpdatedAt());
    }
}
