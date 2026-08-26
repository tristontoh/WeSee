package com.wesee.esg.tenant.dto;

import com.wesee.esg.user.AppUser;
import com.wesee.esg.user.Role;

import java.time.Instant;
import java.util.UUID;

/** Identical to TenantUserResponse plus the generated temporary password — returned only once, at creation time. */
public record CreateTenantUserResponse(
        UUID id,
        String name,
        String email,
        Role role,
        UUID customRoleId,
        String customRoleName,
        boolean active,
        Instant createdAt,
        String temporaryPassword
) {
    public static CreateTenantUserResponse from(AppUser u, String temporaryPassword) {
        return new CreateTenantUserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole(),
                u.getCustomRole() != null ? u.getCustomRole().getId() : null,
                u.getCustomRole() != null ? u.getCustomRole().getName() : null,
                Boolean.TRUE.equals(u.getActive()), u.getCreatedAt(), temporaryPassword);
    }
}
