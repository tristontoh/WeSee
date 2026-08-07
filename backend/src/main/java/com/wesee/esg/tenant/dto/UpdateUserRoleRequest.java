package com.wesee.esg.tenant.dto;

import com.wesee.esg.user.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(
        @NotNull Role role
) {
}
