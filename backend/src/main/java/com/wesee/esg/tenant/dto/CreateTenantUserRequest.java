/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant.dto;

import com.wesee.esg.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** customRoleId is required when role != COMPANY_ADMIN — see CompanyService's validation. */
public record CreateTenantUserRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotNull Role role,
        UUID customRoleId
) {
}
