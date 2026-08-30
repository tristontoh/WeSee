/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant.dto;

import com.wesee.esg.user.Role;

import java.time.Instant;
import java.util.UUID;

public record TenantUserResponse(
        UUID id,
        String name,
        String email,
        Role role,
        UUID customRoleId,
        String customRoleName,
        boolean active,
        Instant createdAt
) {
}
