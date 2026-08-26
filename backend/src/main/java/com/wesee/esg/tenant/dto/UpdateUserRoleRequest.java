package com.wesee.esg.tenant.dto;

import com.wesee.esg.user.Role;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** customRoleId is required when role != COMPANY_ADMIN — see CompanyService's validation. */
public record UpdateUserRoleRequest(
        @NotNull Role role,
        UUID customRoleId
) {
}
