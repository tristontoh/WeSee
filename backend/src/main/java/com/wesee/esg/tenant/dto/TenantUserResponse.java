package com.wesee.esg.tenant.dto;

import com.wesee.esg.user.Role;

import java.time.Instant;
import java.util.UUID;

public record TenantUserResponse(
        UUID id,
        String name,
        String email,
        Role role,
        boolean active,
        Instant createdAt
) {
}
